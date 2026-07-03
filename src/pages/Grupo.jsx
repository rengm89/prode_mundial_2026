import { useEffect, useState } from "react";
import { getDocs, collection } from "firebase/firestore";
import { useAuth } from "../context/useAuth";
import { db } from "../firebase";
import { calcularPuntos } from "../scoring";
import { obtenerFixture, obtenerRonda } from "../services/apiFootball";
import { obtenerPronosticosPartido, esAdministrador } from "../services/firestore";
import { exportarPronosticosCSV, exportarPronosticosPDF } from "../services/export";
import Avatar from "../components/Avatar";
import { SkeletonPronosticos } from "../components/Skeleton";
import styles from "./Grupo.module.css";

function formatearFecha(fechaUtc) {
  return new Date(fechaUtc).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function ganadorPronostico(pronostico) {
  if (pronostico.local > pronostico.visitante) return "local";
  if (pronostico.visitante > pronostico.local) return "visitante";
  return "empate";
}

function resumenPronosticos(prons) {
  const base = { local: 0, empate: 0, visitante: 0, golesLocal: 0, golesVisitante: 0 };
  return prons.reduce((acc, pr) => {
    acc[ganadorPronostico(pr)] += 1;
    acc.golesLocal += pr.local;
    acc.golesVisitante += pr.visitante;
    return acc;
  }, base);
}

function porcentaje(valor, total) {
  if (!total) return 0;
  return Math.round((valor / total) * 100);
}

function textoTendencia(tendencia, partido) {
  if (tendencia === "local") return partido?.teams.home.name ?? "Local";
  if (tendencia === "visitante") return partido?.teams.away.name ?? "Visitante";
  return "Empate";
}

function seccionDePartido(partido) {
  const ronda = obtenerRonda(partido.league?.round);
  return ronda === "Fase de grupos" ? `Grupo ${partido.group}` : ronda;
}

function ordenarPorParticipante(pronosticos, usuarios) {
  return [...pronosticos].sort((a, b) => {
    const nombreA = usuarios[a.userId]?.nombre || "";
    const nombreB = usuarios[b.userId]?.nombre || "";
    return nombreA.localeCompare(nombreB, "es", { sensitivity: "base" });
  });
}

export default function Grupo() {
  const user = useAuth();
  const [partidos, setPartidos] = useState([]);
  const [usuarios, setUsuarios] = useState({});
  const [pronosticosMap, setPronosticosMap] = useState({});
  const [cargando, setCargando] = useState(true);
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);
  const [filtroPartidos, setFiltroPartidos] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    async function cargar() {
      const [fixture, usuariosSnap] = await Promise.all([
        obtenerFixture(),
        getDocs(collection(db, "usuarios")),
      ]);

      const usMap = {};
      usuariosSnap.docs.forEach((d) => {
        const data = d.data();
        usMap[d.id] = {
          nombre: data.nombre,
          photoURL: data.photoURL,
        };
      });

      const ordenados = [...fixture].sort(
        (a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)
      );

      const ahora = Date.now();
      const cerrados = ordenados.filter(
        (p) => ahora >= new Date(p.fixture.date).getTime() - 60 * 60 * 1000
      );

      const pMap = {};
      await Promise.all(
        cerrados.map(async (p) => {
          pMap[p.fixture.id] = await obtenerPronosticosPartido(p.fixture.id);
        })
      );

      setUsuarios(usMap);
      setPartidos(cerrados);
      setPronosticosMap(pMap);
      if (cerrados.length > 0) {
        const ultimoCerrado = cerrados[cerrados.length - 1];
        setFiltroPartidos(seccionDePartido(ultimoCerrado));
        setPartidoSeleccionado(ultimoCerrado.fixture.id);
      }
      
      if (user?.uid) {
        const admin = await esAdministrador(user.uid);
        setEsAdmin(admin);
      }
      
      setCargando(false);
    }

    cargar();
  }, [user?.uid]);

  const partido = partidos.find((p) => p.fixture.id === partidoSeleccionado);
  const prons = pronosticosMap[partidoSeleccionado] ?? [];
  const pronsOrdenados = ordenarPorParticipante(prons, usuarios);
  const resumen = resumenPronosticos(prons);
  const ronda = obtenerRonda(partido?.league?.round);
  const tieneResultado = partido?.goals.home !== null && partido?.goals.away !== null;
  const promedioLocal = prons.length ? (resumen.golesLocal / prons.length).toFixed(1) : "0.0";
  const promedioVisitante = prons.length ? (resumen.golesVisitante / prons.length).toFixed(1) : "0.0";
  const filtrosPartidos = partidos.reduce(
    (acc, p) => {
      const seccion = seccionDePartido(p);
      acc[seccion] = (acc[seccion] || 0) + 1;
      return acc;
    },
    {}
  );
  const opcionesFiltro = Object.entries(filtrosPartidos).map(([key, count]) => ({ key, label: key, count }));
  const filtroActivo = filtroPartidos ?? opcionesFiltro[0]?.key ?? null;
  const partidosFiltrados = filtroActivo
    ? partidos.filter((p) => seccionDePartido(p) === filtroActivo)
    : [];

  const cambiarFiltroPartidos = (filtro) => {
    setFiltroPartidos(filtro);
    const visibles = partidos.filter((p) => seccionDePartido(p) === filtro);

    if (visibles.length > 0 && !visibles.some((p) => p.fixture.id === partidoSeleccionado)) {
      setPartidoSeleccionado(visibles[visibles.length - 1].fixture.id);
    }
  };

  const handleExportarCSV = async () => {
    if (!partido || prons.length === 0) return;
    setExportando(true);
    try {
      const nombreArchivo = `pronosticos-${partido.teams.home.name.replace(/\s+/g, "-")}-vs-${partido.teams.away.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}`;
      await exportarPronosticosCSV(partido, pronsOrdenados, usuarios, nombreArchivo);
    } catch (error) {
      console.error("Error al exportar CSV:", error);
      alert("Error al exportar CSV");
    } finally {
      setExportando(false);
    }
  };

  const handleExportarPDF = async () => {
    if (!partido || prons.length === 0) return;
    setExportando(true);
    try {
      const nombreArchivo = `pronosticos-${partido.teams.home.name.replace(/\s+/g, "-")}-vs-${partido.teams.away.name.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}`;
      await exportarPronosticosPDF(partido, pronsOrdenados, resumen, usuarios, nombreArchivo);
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      alert("Error al exportar PDF");
    } finally {
      setExportando(false);
    }
  };

  if (cargando) return <SkeletonPronosticos />;

  if (partidos.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.vacio}>
          <p>Los pronosticos del grupo se revelan 1 hora antes de cada partido.</p>
          <p className={styles.subVacio}>Volve cuando este cerca el primer partido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Pronosticos del grupo</h2>
        <p className={styles.sub}>Se muestran los pronosticos una vez cerrada la ventana de carga.</p>
      </div>

      <div className={styles.filtros} aria-label="Filtrar partidos revelados">
        {opcionesFiltro.map((opcion) => (
          <button
            key={opcion.key}
            className={`${styles.filtroBtn} ${filtroActivo === opcion.key ? styles.filtroActivo : ""}`}
            onClick={() => cambiarFiltroPartidos(opcion.key)}
          >
            {opcion.label}
            <span>{opcion.count}</span>
          </button>
        ))}
      </div>

      <div className={styles.selector}>
        {partidosFiltrados.map((p) => (
          <button
            key={p.fixture.id}
            className={`${styles.chip} ${partidoSeleccionado === p.fixture.id ? styles.chipActivo : ""}`}
            onClick={() => setPartidoSeleccionado(p.fixture.id)}
          >
            {p.teams.home.name.slice(0, 3).toUpperCase()} vs {p.teams.away.name.slice(0, 3).toUpperCase()}
          </button>
        ))}
      </div>

      {prons.length > 0 && esAdmin && (
        <div style={{ display: "flex", gap: "8px", margin: "16px 0", justifyContent: "center" }}>
          <button
            onClick={handleExportarCSV}
            disabled={exportando}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: exportando ? "not-allowed" : "pointer",
              opacity: exportando ? 0.6 : 1,
            }}
            title="Descargar pronósticos como CSV"
          >
            📊 CSV
          </button>
          <button
            onClick={handleExportarPDF}
            disabled={exportando}
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: exportando ? "not-allowed" : "pointer",
              opacity: exportando ? 0.6 : 1,
            }}
            title="Descargar pronósticos como PDF"
          >
            📄 PDF
          </button>
        </div>
      )}

      {partido && (
        <div className={styles.contenido}>
          <div className={styles.matchHeader}>
            <div className={styles.matchFecha}>
              {formatearFecha(partido.fixture.date)} · {ronda}
            </div>
            <div className={styles.matchTeams}>
              <span className={styles.team}>{partido.teams.home.name}</span>
              <span className={styles.matchSep}>vs</span>
              <span className={styles.team}>{partido.teams.away.name}</span>
            </div>
            {tieneResultado && (
              <div className={styles.resultadoReal}>
                Resultado: <strong>{partido.goals.home} - {partido.goals.away}</strong>
              </div>
            )}
          </div>

          {prons.length === 0 ? (
            <p className={styles.sinDatos}>Ningun participante cargo pronostico para este partido.</p>
          ) : (
            <>
              <div className={styles.resumen}>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>{partido.teams.home.name}</span>
                  <strong>{resumen.local}</strong>
                  <div className={styles.meter}>
                    <span style={{ width: `${porcentaje(resumen.local, prons.length)}%` }} />
                  </div>
                </div>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>Empate</span>
                  <strong>{resumen.empate}</strong>
                  <div className={styles.meter}>
                    <span style={{ width: `${porcentaje(resumen.empate, prons.length)}%` }} />
                  </div>
                </div>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>{partido.teams.away.name}</span>
                  <strong>{resumen.visitante}</strong>
                  <div className={styles.meter}>
                    <span style={{ width: `${porcentaje(resumen.visitante, prons.length)}%` }} />
                  </div>
                </div>
                <div className={styles.resumenItem}>
                  <span className={styles.resumenLabel}>Promedio</span>
                  <strong>{promedioLocal} - {promedioVisitante}</strong>
                  <small>{prons.length} pronostico{prons.length === 1 ? "" : "s"}</small>
                </div>
              </div>

              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Participante</th>
                    <th>{partido.teams.home.name}</th>
                    <th></th>
                    <th>{partido.teams.away.name}</th>
                    <th>Tendencia</th>
                    {tieneResultado && <th>Pts</th>}
                  </tr>
                </thead>
                <tbody>
                  {pronsOrdenados.map((pr) => {
                    const esMio = pr.userId === user?.uid;
                    const participante = usuarios[pr.userId];
                    const tendencia = ganadorPronostico(pr);
                    const puntos = tieneResultado
                      ? calcularPuntos(
                          { local: pr.local, visitante: pr.visitante },
                          { local: partido.goals.home, visitante: partido.goals.away },
                          ronda
                        )
                      : null;

                    return (
                      <tr key={pr.userId} className={esMio ? styles.miFila : ""}>
                        <td className={styles.nombre}>
                          <span className={styles.participante}>
                            <Avatar
                              nombre={participante?.nombre}
                              photoURL={participante?.photoURL}
                              size="sm"
                            />
                            <span className={styles.participanteNombre}>
                              {participante?.nombre ?? "-"}
                            </span>
                            {esMio && <span className={styles.vosBadge}>vos</span>}
                          </span>
                        </td>
                        <td className={styles.gol}>{pr.local}</td>
                        <td className={styles.guion}>-</td>
                        <td className={styles.gol}>{pr.visitante}</td>
                        <td className={styles.tendencia}>{textoTendencia(tendencia, partido)}</td>
                        {tieneResultado && <td className={styles.puntos}>{puntos}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
