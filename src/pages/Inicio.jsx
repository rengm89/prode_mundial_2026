import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { obtenerFixture } from "../services/apiFootball";
import { obtenerPronosticosUsuario, obtenerTabla } from "../services/firestore";
import { codigoBandera } from "../services/banderas";
import { estaDisponibleParaPronosticar, formatearFechaHora } from "../hooks/usePronosticos";
import { agregarPosicionesCompartidas } from "../utils/posiciones";
import { SkeletonPronosticos } from "../components/Skeleton";
import styles from "./Inicio.module.css";

const MAX_PROXIMOS_INICIO = 6;
const CIERRE_MINUTOS = 60;
const MS_24H = 24 * 60 * 60 * 1000;

function tienePronostico(pronostico) {
  return pronostico?.local !== undefined && pronostico?.visitante !== undefined;
}

function estadoPartido(partido, pronosticos) {
  if (!estaDisponibleParaPronosticar(partido)) return "cerrado";
  if (tienePronostico(pronosticos[partido.fixture.id])) return "guardado";
  return "pendiente";
}

function textoEstado(estado) {
  if (estado === "guardado") return "Guardado";
  if (estado === "cerrado") return "Cerrado";
  return "Pendiente";
}

function tiempoHasta(fechaUtc) {
  const diffMs = new Date(fechaUtc).getTime() - Date.now();
  if (diffMs <= 0) return "en juego";
  const horas = Math.ceil(diffMs / (60 * 60 * 1000));
  if (horas < 24) return `en ${horas} h`;
  const dias = Math.ceil(horas / 24);
  return `en ${dias} dia${dias === 1 ? "" : "s"}`;
}

function cierraDentroDe24Horas(partido) {
  const cierre = new Date(partido.fixture.date).getTime() - CIERRE_MINUTOS * 60 * 1000;
  const diffMs = cierre - Date.now();
  return diffMs > 0 && diffMs <= MS_24H;
}

export default function Inicio() {
  const user = useAuth();
  const [fixture, setFixture] = useState([]);
  const [pronosticos, setPronosticos] = useState({});
  const [tabla, setTabla] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargar() {
      if (!user?.uid) return;
      setCargando(true);
      setError("");
      try {
        const [partidos, misPronosticos] = await Promise.all([
          obtenerFixture(),
          obtenerPronosticosUsuario(user.uid),
        ]);
        const ordenados = [...partidos].sort(
          (a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)
        );
        const mapa = {};
        misPronosticos.forEach((p) => {
          if (p.local !== null && p.local !== undefined && p.visitante !== null && p.visitante !== undefined) {
            mapa[p.partidoId] = { local: p.local, visitante: p.visitante };
          }
        });
        const posiciones = await obtenerTabla(ordenados);
        setFixture(ordenados);
        setPronosticos(mapa);
        setTabla(posiciones);
      } catch {
        setError("No se pudo cargar el inicio.");
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [user?.uid]);

  if (cargando) return <SkeletonPronosticos />;
  if (error) return <div className={styles.errorMsg}>{error}</div>;

  const abiertos = fixture.filter(estaDisponibleParaPronosticar);
  const guardados = fixture.filter((p) => tienePronostico(pronosticos[p.fixture.id])).length;
  const pendientes = abiertos.filter((p) => !tienePronostico(pronosticos[p.fixture.id])).length;
  const pendientes24h = abiertos.filter(
    (p) => !tienePronostico(pronosticos[p.fixture.id]) && cierraDentroDe24Horas(p)
  );
  const proximoPendiente24h = pendientes24h[0] ?? null;
  const proximos = abiertos.slice(0, MAX_PROXIMOS_INICIO);
  const tablaConPosiciones = agregarPosicionesCompartidas(tabla);
  const miFila = tablaConPosiciones.find((u) => u.id === user?.uid) ?? null;
  const lider = tablaConPosiciones[0];
  const lideres = tablaConPosiciones.filter((u) => u.posicion === 1);
  const textoLideres = lideres.map((u) => u.nombre).join(", ");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.titulo}>Inicio</h2>
          <p className={styles.sub}>Un vistazo rapido a lo que tenes que cargar y como viene la tabla.</p>
        </div>
        <Link to="/pronosticos" className={styles.primaryLink}>Cargar pronosticos</Link>
      </div>

      <section className={styles.stats} aria-label="Resumen">
        <div className={styles.stat}>
          <span className={styles.statLabel}>Pendientes</span>
          <strong className={styles.statValue}>{pendientes}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Guardados</span>
          <strong className={styles.statValue}>{guardados}/{fixture.length}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Tu posicion</span>
          <strong className={styles.statValue}>{miFila ? `#${miFila.posicion}` : "-"}</strong>
        </div>
      </section>

      {pendientes24h.length > 0 && (
        <Link to="/pronosticos" className={styles.alertaPendientes}>
          <div>
            <span>Atencion</span>
            <strong>
              Tenes {pendientes24h.length} partido{pendientes24h.length === 1 ? "" : "s"} sin cargar que cierran en menos de 24 hs
            </strong>
            {proximoPendiente24h && (
              <small>
                Proximo: {proximoPendiente24h.teams.home.name} vs {proximoPendiente24h.teams.away.name}
              </small>
            )}
          </div>
          <span>Cargar ahora</span>
        </Link>
      )}

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Proximos partidos</h3>
            <Link to="/pronosticos">Ver todos</Link>
          </div>

          {proximos.length === 0 ? (
            <p className={styles.empty}>No quedan partidos abiertos.</p>
          ) : (
            <div className={styles.matchList}>
              {proximos.map((partido) => {
                const horario = formatearFechaHora(partido.fixture.date);
                const estado = estadoPartido(partido, pronosticos);
                const homeCode = codigoBandera(partido.teams.home.name);
                const awayCode = codigoBandera(partido.teams.away.name);

                return (
                  <Link to="/pronosticos" className={styles.match} key={partido.fixture.id}>
                    <div className={styles.matchMeta}>
                      <span>{horario.fecha} · {horario.hora}</span>
                      <span>{tiempoHasta(partido.fixture.date)}</span>
                    </div>
                    <div className={styles.teams}>
                      <span className={`fi fi-${homeCode} ${styles.flag}`} />
                      <strong>{partido.teams.home.name}</strong>
                      <span className={styles.vs}>vs</span>
                      <strong>{partido.teams.away.name}</strong>
                      <span className={`fi fi-${awayCode} ${styles.flag}`} />
                    </div>
                    <span className={`${styles.badge} ${styles[estado]}`}>{textoEstado(estado)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Tu tabla</h3>
            <Link to="/tabla">Completa</Link>
          </div>

          {miFila ? (
            <div className={styles.rankBox}>
              <div className={styles.rankNumber}>#{miFila.posicion}</div>
              <div>
                <strong>{miFila.puntos} pts</strong>
                <span>{miFila.exactos} exactos · {miFila.ganadores} ganadores</span>
              </div>
            </div>
          ) : (
            <p className={styles.empty}>Todavia no apareces en la tabla.</p>
          )}

          {lider && (
            <div className={styles.leader}>
              <span>{lideres.length > 1 ? "Lideres actuales" : "Lider actual"}</span>
              <strong>{textoLideres}</strong>
              <span>{lider.puntos} pts</span>
            </div>
          )}

          <div className={styles.quickLinks}>
            <Link to="/grupo">Ver grupo</Link>
            <Link to="/tabla">Ver posiciones</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
