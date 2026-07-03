import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { obtenerFixture } from "../services/apiFootball";
import { obtenerTabla, esAdministrador } from "../services/firestore";
import { exportarTablaCSV, exportarTablaPDF } from "../services/export";
import { agregarPosicionesCompartidas } from "../utils/posiciones";
import Avatar from "../components/Avatar";
import { SkeletonTabla } from "../components/Skeleton";
import styles from "./Tabla.module.css";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function Tabla() {
  const user = useAuth();
  const [tabla, setTabla] = useState([]);
  const [movimientos, setMovimientos] = useState({});
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);

  useEffect(() => {
    async function cargar() {
      const partidos = await obtenerFixture();
      const t = agregarPosicionesCompartidas(await obtenerTabla(partidos));
      const partidosConResultado = partidos
        .filter((p) => p.goals.home !== null && p.goals.away !== null)
        .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

      if (partidosConResultado.length > 1) {
        const ultimoResultado = partidosConResultado[partidosConResultado.length - 1];
        const partidosPrevios = partidos.filter(
          (p) => p.fixture.id !== ultimoResultado.fixture.id
        );
        const tablaPrevia = agregarPosicionesCompartidas(await obtenerTabla(partidosPrevios));
        const posicionesPrevias = Object.fromEntries(
          tablaPrevia.map((u) => [u.id, u.posicion])
        );
        const cambios = Object.fromEntries(
          t.map((u) => [u.id, (posicionesPrevias[u.id] ?? u.posicion) - u.posicion])
        );
        setMovimientos(cambios);
      } else {
        setMovimientos({});
      }

      setTabla(t);

      if (user?.uid) {
        const admin = await esAdministrador(user.uid);
        setEsAdmin(admin);
      }

      setCargando(false);
    }
    cargar();
  }, [user?.uid]);

  const tablaConPosiciones = tabla;
  const maxPuntos = tablaConPosiciones[0]?.puntos || 1;
  const lider = tablaConPosiciones[0];
  const lideres = tablaConPosiciones.filter((u) => u.posicion === 1);
  const textoLideres = lideres.map((u) => u.nombre).join(", ");
  const miFila = tablaConPosiciones.find((u) => u.id === user?.uid) ?? null;
  const diferenciaPunta = lider && miFila ? Math.max(0, lider.puntos - miFila.puntos) : 0;
  const exactosTotales = tablaConPosiciones.reduce((acc, u) => acc + (u.exactos || 0), 0);

  const handleExportarCSV = async () => {
    setExportando(true);
    try {
      await exportarTablaCSV(tablaConPosiciones, `tabla-posiciones-${new Date().toISOString().split("T")[0]}`);
    } catch (error) {
      console.error("Error al exportar CSV:", error);
      alert("Error al exportar CSV");
    } finally {
      setExportando(false);
    }
  };

  const handleExportarPDF = async () => {
    setExportando(true);
    try {
      await exportarTablaPDF(tablaConPosiciones, `tabla-posiciones-${new Date().toISOString().split("T")[0]}`);
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      alert("Error al exportar PDF");
    } finally {
      setExportando(false);
    }
  };

  if (cargando) return <SkeletonTabla />;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Tabla de posiciones</h2>
        <p className={styles.sub}>Actualizada automaticamente al terminar cada partido.</p>
        {tabla.length > 0 && esAdmin && (
          <div className={styles.exportActions}>
            <button
              className={`${styles.exportBtn} ${styles.exportCsv}`}
              onClick={handleExportarCSV}
              disabled={exportando}
              title="Descargar como CSV"
            >
              CSV
            </button>
            <button
              className={`${styles.exportBtn} ${styles.exportPdf}`}
              onClick={handleExportarPDF}
              disabled={exportando}
              title="Descargar como PDF"
            >
              PDF
            </button>
          </div>
        )}
      </div>

      <section className={styles.resumen} aria-label="Resumen de posiciones">
        <div className={styles.resumenItem}>
          <span className={styles.resumenLabel}>Participantes</span>
          <strong className={styles.resumenValor}>{tabla.length}</strong>
        </div>
        <div className={styles.resumenItem}>
          <span className={styles.resumenLabel}>Lider</span>
          <strong className={styles.resumenTexto}>{textoLideres || "-"}</strong>
        </div>
        <div className={styles.resumenItem}>
          <span className={styles.resumenLabel}>Tu posicion</span>
          <strong className={styles.resumenValor}>{miFila ? `#${miFila.posicion}` : "-"}</strong>
        </div>
        <div className={styles.resumenItem}>
          <span className={styles.resumenLabel}>A la punta</span>
          <strong className={styles.resumenValor}>{miFila ? `${diferenciaPunta} pts` : "-"}</strong>
        </div>
        <div className={styles.resumenItem}>
          <span className={styles.resumenLabel}>Exactos totales</span>
          <strong className={styles.resumenValor}>{exactosTotales}</strong>
        </div>
      </section>

      {tabla.length === 0 ? (
        <div className={styles.vacio}>
          <p>El torneo aun no comenzo.</p>
          <p className={styles.subVacio}>Los puntos apareceran cuando se juegue el primer partido.</p>
        </div>
      ) : (
        <div className={styles.lista}>
          {tablaConPosiciones.map((u, i) => {
            const esMio = u.id === user?.uid;
            const color = COLORS[i % COLORS.length];
            const porcentaje = maxPuntos > 0 ? (u.puntos / maxPuntos) * 100 : 0;
            const movimiento = movimientos[u.id] ?? 0;

            return (
              <div key={u.id} className={`${styles.fila} ${esMio ? styles.miFila : ""}`}>
                <div className={styles.pos}>
                  <span className={styles.numPos}>{u.posicion}</span>
                </div>
                <Avatar nombre={u.nombre} photoURL={u.photoURL} color={color} />
                <div className={styles.info}>
                  <div className={styles.nombre}>
                    {u.nombre}
                    {esMio && <span className={styles.vosBadge}>vos</span>}
                  </div>
                  <div className={styles.barra}>
                    <div
                      className={styles.barraFill}
                      style={{ width: `${porcentaje}%`, background: color }}
                    />
                  </div>
                  <div className={styles.stats}>
                    <span>{u.exactos} exactos</span>
                    <span>-</span>
                    <span>{u.ganadores} ganadores</span>
                    {movimiento !== 0 && (
                      <>
                        <span>-</span>
                        <span className={movimiento > 0 ? styles.movSube : styles.movBaja}>
                          {movimiento > 0 ? `Subio ${movimiento}` : `Bajo ${Math.abs(movimiento)}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.puntos} style={{ color }}>
                  {u.puntos}
                  <span className={styles.ptLabel}>pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.leyenda}>
        <h3 className={styles.leyendaTitulo}>Sistema de puntos</h3>
        <div className={styles.leyendaGrid}>
          {[
            { ronda: "Fase de grupos", exacto: 3, ganador: 1, nota: null },
            { ronda: "Dieciseisavos / Octavos / Cuartos", exacto: 5, ganador: 2, nota: "3 pts empate exacto sin clasificado" },
            { ronda: "Semifinales / Final / Tercer puesto", exacto: 8, ganador: 3, nota: "3 pts empate exacto sin clasificado" },
          ].map((r) => (
            <div key={r.ronda} className={styles.leyendaItem}>
              <div className={styles.leyendaRonda}>{r.ronda}</div>
              <div className={styles.leyendaPts}>
                <span className={styles.ptExacto}>{r.exacto} pts</span> exacto
                <span className={styles.ptSep}> - </span>
                <span className={styles.ptGanador}>{r.ganador} pt{r.ganador > 1 ? "s" : ""}</span> ganador
              </div>
              {r.nota && <div className={styles.leyendaNota}>{r.nota}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
