import jsPDF from "jspdf";

const PDF_THEME = {
  navy: [13, 27, 62],
  blue: [37, 99, 235],
  red: [225, 29, 72],
  green: [16, 185, 129],
  gold: [245, 158, 11],
  ink: [15, 23, 42],
  muted: [71, 85, 105],
  tableHeader: [24, 42, 85],
  card: [239, 246, 255],
  cardAlt: [240, 253, 244],
  rowAlt: [248, 250, 252],
  border: [203, 213, 225],
  leader: [255, 247, 237],
};

/**
 * Exporta tabla de posiciones a CSV
 * @param {Array} tabla - Array de usuarios con puntos, exactos, ganadores
 * @param {string} nombreArchivo - Nombre del archivo (sin extension)
 */
export async function exportarTablaCSV(tabla, nombreArchivo = "tabla-posiciones") {
  const lideres = obtenerLideres(tabla);
  const textoLideres = formatearNombres(lideres);
  const headers = ["Pos.", "Participante", "Puntos"];
  const filas = tabla.map((u, i) => [
    u.posicion ?? i + 1,
    u.nombre || "Desconocido",
    u.puntos || 0,
  ]);
  const resumen = [
    [lideres.length > 1 ? "Punteros" : "Puntero", textoLideres || "-"],
    ["Puntos puntero", lideres[0]?.puntos || 0],
    ["Regla eliminatorias", "Empate exacto sin clasificado correcto: 3 pts"],
    [],
  ];

  descargarCSV(crearCSV([...resumen, headers, ...filas]), nombreArchivo);
}

/**
 * Exporta pronosticos de un partido a CSV
 * @param {Object} partido - Objeto del partido
 * @param {Array} pronosticos - Array de pronosticos
 * @param {Object} usuarios - Mapa de usuarios
 * @param {string} nombreArchivo - Nombre del archivo (sin extension)
 */
export async function exportarPronosticosCSV(
  partido,
  pronosticos,
  usuarios,
  nombreArchivo = "pronosticos-partido"
) {
  const local = partido.teams.home.name;
  const visitante = partido.teams.away.name;
  const incluirClasifica = esEliminatoria(partido);
  const headers = ["Participante", local, visitante, "Tendencia"];
  if (incluirClasifica) headers.push("Clasifica");
  const filas = pronosticos.map((p) => {
    const fila = [
      usuarios[p.userId]?.nombre || "Desconocido",
      p.local,
      p.visitante,
      textoTendencia(ganadorPronostico(p), partido),
    ];
    if (incluirClasifica) fila.push(textoClasifica(p, partido));
    return fila;
  });

  const nombrePartido = `${partido.teams.home.name}-vs-${partido.teams.away.name}`;
  descargarCSV(crearCSV([headers, ...filas]), nombreArchivo || nombrePartido);
}

/**
 * Exporta tabla de posiciones a PDF
 * @param {Array} tabla - Array de usuarios
 * @param {string} nombreArchivo - Nombre del archivo (sin extension)
 */
export async function exportarTablaPDF(tabla, nombreArchivo = "tabla-posiciones") {
  try {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const lideres = obtenerLideres(tabla);
    const lider = lideres[0];
    const textoLideres = formatearNombres(lideres);
    const fecha = new Date().toLocaleDateString("es-AR");
    const headers = ["Pos.", "Participante", "Puntos"];
    const colWidths = [20, 100, 30];
    const tableWidth = colWidths.reduce((total, width) => total + width, 0);
    const rowHeight = 6.8;
    let y = margin;

    const drawHeader = () => {
      drawPdfHeader(
        pdf,
        pageWidth,
        margin,
        "Tabla de posiciones",
        "Prode Mundial 2026",
        `Generado: ${fecha} | Puntos puntero: ${lider?.puntos || 0}`
      );

      y = 34;
      const resumenItems = [
        { label: "Participantes", value: String(tabla.length), width: 35 },
        { label: lideres.length > 1 ? "Punteros" : "Puntero", value: textoLideres || "-", width: 115 },
        { label: "Puntos", value: String(lider?.puntos || 0), width: 40 },
      ];
      let x = margin;
      resumenItems.forEach(({ label, value, width }, index) => {
        setFill(pdf, index === 1 ? PDF_THEME.cardAlt : PDF_THEME.card);
        pdf.rect(x, y, width - 2, 18, "F");
        setDraw(pdf, PDF_THEME.border);
        pdf.rect(x, y, width - 2, 18, "S");
        setText(pdf, PDF_THEME.muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text(label, x + 3, y + 5);
        setText(pdf, PDF_THEME.ink);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(pdf.splitTextToSize(String(value), width - 6).slice(0, 2), x + 3, y + 12);
        x += width;
      });
      y += 23;
      setText(pdf, PDF_THEME.gold);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.text("Regla eliminatorias: empate exacto sin clasificado correcto = 3 pts", margin, y - 3);
    };

    const drawTableHeader = () => {
      let x = margin;
      setFill(pdf, PDF_THEME.tableHeader);
      pdf.rect(margin, y, tableWidth, rowHeight, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      headers.forEach((header, index) => {
        const align = index === 1 ? "left" : "center";
        const textX = align === "left" ? x + 3 : x + colWidths[index] / 2;
        pdf.text(header, textX, y + 4.8, { align });
        x += colWidths[index];
      });
      y += rowHeight;
    };

    drawHeader();
    drawTableHeader();

    tabla.forEach((u, rowIndex) => {
      if (y + rowHeight > pageHeight - margin) {
        pdf.addPage();
        drawHeader();
        drawTableHeader();
      }

      let x = margin;
      const fila = [
        String(u.posicion ?? rowIndex + 1),
        u.nombre || "Desconocido",
        String(u.puntos || 0),
      ];

      const esPuntero = (u.posicion ?? rowIndex + 1) === 1;
      if (esPuntero) {
        setFill(pdf, PDF_THEME.leader);
      } else if (rowIndex % 2 === 0) {
        pdf.setFillColor(255, 255, 255);
      } else {
        setFill(pdf, PDF_THEME.rowAlt);
      }
      pdf.rect(margin, y, tableWidth, rowHeight, "F");
      setDraw(pdf, PDF_THEME.border);
      pdf.line(margin, y + rowHeight, margin + tableWidth, y + rowHeight);
      setText(pdf, PDF_THEME.ink);
      pdf.setFont("helvetica", esPuntero ? "bold" : "normal");
      pdf.setFontSize(7.5);

      fila.forEach((celda, index) => {
        const align = index === 1 ? "left" : "center";
        const textX = align === "left" ? x + 3 : x + colWidths[index] / 2;
        const text = index === 1
          ? pdf.splitTextToSize(celda, colWidths[index] - 6)[0]
          : celda;
        pdf.text(text, textX, y + 4.8, { align });
        x += colWidths[index];
      });
      y += rowHeight;
    });

    pdf.save(`${nombreArchivo}.pdf`);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    alert("Error al generar PDF");
  }
}

/**
 * Exporta pronosticos de un partido a PDF
 * @param {Object} partido - Objeto del partido
 * @param {Array} pronosticos - Array de pronosticos
 * @param {Object} resumen - Resumen de pronosticos
 * @param {Object} usuarios - Mapa de usuarios
 * @param {string} nombreArchivo - Nombre del archivo (sin extension)
 */
export async function exportarPronosticosPDF(
  partido,
  pronosticos,
  resumen,
  usuarios,
  nombreArchivo = "pronosticos-partido"
) {
  try {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const local = partido.teams.home.name;
    const visitante = partido.teams.away.name;
    const tieneResultado = partido?.goals.home !== null && partido?.goals.away !== null;
    const promedioLocal = pronosticos.length ? (resumen.golesLocal / pronosticos.length).toFixed(1) : "0.0";
    const promedioVisitante = pronosticos.length ? (resumen.golesVisitante / pronosticos.length).toFixed(1) : "0.0";
    const resultado = tieneResultado
      ? `Resultado: ${partido.goals.home} - ${partido.goals.away}`
      : "Resultado: No disponible";
    const fecha = new Date(partido.fixture.date).toLocaleDateString("es-AR");
    const incluirClasifica = esEliminatoria(partido);
    const filas = pronosticos.map((p) => {
      const fila = [
        usuarios[p.userId]?.nombre || "Desconocido",
        String(p.local),
        String(p.visitante),
        textoTendencia(ganadorPronostico(p), partido),
      ];
      if (incluirClasifica) fila.push(textoClasifica(p, partido));
      return fila;
    });
    const headers = ["Participante", local, visitante, "Tendencia"];
    if (incluirClasifica) headers.push("Clasifica");
    const colWidths = incluirClasifica ? [58, 28, 28, 42, 30] : [68, 34, 34, 50];
    const rowHeight = 8;
    let y = margin;

    const drawHeader = () => {
      drawPdfHeader(
        pdf,
        pageWidth,
        margin,
        "Pronosticos del partido",
        `${local} vs ${visitante}`,
        `${fecha} | ${resultado}`
      );

      y = 38;
      setText(pdf, PDF_THEME.ink);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("Resumen", margin, y);
      y += 4;

      const resumenItems = [
        ["Pronosticos", String(pronosticos.length)],
        [local, String(resumen.local)],
        ["Empate", String(resumen.empate)],
        [visitante, String(resumen.visitante)],
        [`Promedio ${local}`, promedioLocal],
        [`Promedio ${visitante}`, promedioVisitante],
      ];
      const itemWidth = (pageWidth - margin * 2) / resumenItems.length;
      resumenItems.forEach(([label, value], index) => {
        const x = margin + index * itemWidth;
        setFill(pdf, index % 2 === 0 ? PDF_THEME.card : PDF_THEME.cardAlt);
        pdf.rect(x, y, itemWidth - 2, 18, "F");
        setDraw(pdf, PDF_THEME.border);
        pdf.rect(x, y, itemWidth - 2, 18, "S");
        setText(pdf, PDF_THEME.muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text(pdf.splitTextToSize(label, itemWidth - 6), x + 3, y + 5);
        setText(pdf, PDF_THEME.ink);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(value, x + 3, y + 15);
      });
      y += 26;
    };

    const drawTableHeader = () => {
      let x = margin;
      setFill(pdf, PDF_THEME.tableHeader);
      pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      headers.forEach((header, index) => {
        const align = index === 0 ? "left" : "center";
        const textX = align === "left" ? x + 3 : x + colWidths[index] / 2;
        pdf.text(pdf.splitTextToSize(header, colWidths[index] - 4)[0] || "", textX, y + 5.7, { align });
        x += colWidths[index];
      });
      y += rowHeight;
    };

    drawHeader();
    drawTableHeader();

    filas.forEach((fila, rowIndex) => {
      if (y + rowHeight > pageHeight - margin) {
        pdf.addPage();
        drawHeader();
        drawTableHeader();
      }

      let x = margin;
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(255, 255, 255);
      } else {
        setFill(pdf, PDF_THEME.rowAlt);
      }
      pdf.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
      setDraw(pdf, PDF_THEME.border);
      pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
      setText(pdf, PDF_THEME.ink);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);

      fila.forEach((celda, index) => {
        const align = index === 0 ? "left" : "center";
        const textX = align === "left" ? x + 3 : x + colWidths[index] / 2;
        const text = index === 0
          ? pdf.splitTextToSize(celda, colWidths[index] - 6)[0]
          : celda;
        pdf.text(text, textX, y + 5.7, { align });
        x += colWidths[index];
      });
      y += rowHeight;
    });

    const nombrePartido = `${partido.teams.home.name}-vs-${partido.teams.away.name}`;
    pdf.save(`${nombreArchivo || nombrePartido}.pdf`);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    alert("Error al generar PDF");
  }
}

/**
 * Descarga un archivo CSV
 * @param {string} contenido - Contenido CSV
 * @param {string} nombreArchivo - Nombre del archivo (sin extension)
 */
function descargarCSV(contenido, nombreArchivo) {
  const blob = new Blob([`\uFEFFsep=,\r\n${contenido}`], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${nombreArchivo}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function crearCSV(filas) {
  return filas
    .map((fila) => fila.map(escaparCeldaCSV).join(","))
    .join("\r\n");
}

function escaparCeldaCSV(celda) {
  const texto = celda === null || celda === undefined ? "" : String(celda);
  return `"${texto.replace(/"/g, '""')}"`;
}

function ganadorPronostico(pronostico) {
  if (pronostico.local > pronostico.visitante) return "local";
  if (pronostico.visitante > pronostico.local) return "visitante";
  return "empate";
}

function textoTendencia(tendencia, partido) {
  if (tendencia === "local") return partido?.teams.home.name ?? "Local";
  if (tendencia === "visitante") return partido?.teams.away.name ?? "Visitante";
  return "Empate";
}

function esEliminatoria(partido) {
  return partido?.league?.round !== "Fase de grupos";
}

function textoClasifica(pronostico, partido) {
  const tendencia = ganadorPronostico(pronostico);
  if (tendencia === "local") return partido?.teams.home.name ?? "Local";
  if (tendencia === "visitante") return partido?.teams.away.name ?? "Visitante";
  if (pronostico.ganadorEmpate === "local") return partido?.teams.home.name ?? "Local";
  if (pronostico.ganadorEmpate === "visitante") return partido?.teams.away.name ?? "Visitante";
  return "";
}

function drawPdfHeader(pdf, pageWidth, margin, title, subtitle, meta) {
  setFill(pdf, PDF_THEME.navy);
  pdf.rect(0, 0, pageWidth, 30, "F");

  const stripeY = 27;
  const stripeWidth = pageWidth / 4;
  [PDF_THEME.red, PDF_THEME.blue, PDF_THEME.green, PDF_THEME.gold].forEach((color, index) => {
    setFill(pdf, color);
    pdf.rect(index * stripeWidth, stripeY, stripeWidth, 3, "F");
  });

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(title, margin, 12);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(subtitle, margin, 20);
  pdf.text(pdf.splitTextToSize(meta, 82), pageWidth - margin, 12, { align: "right" });
}

function setFill(pdf, color) {
  pdf.setFillColor(color[0], color[1], color[2]);
}

function setText(pdf, color) {
  pdf.setTextColor(color[0], color[1], color[2]);
}

function setDraw(pdf, color) {
  pdf.setDrawColor(color[0], color[1], color[2]);
}

function obtenerLideres(tabla) {
  const puntosMaximos = tabla[0]?.puntos;
  if (puntosMaximos === undefined) return [];
  return tabla.filter((u, i) => (u.posicion ?? i + 1) === 1 || u.puntos === puntosMaximos);
}

function formatearNombres(usuarios) {
  return usuarios.map((u) => u.nombre || "Desconocido").join(", ");
}
