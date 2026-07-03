import { useState } from "react";
import { useAuth } from "../context/useAuth";
import {
  usePronosticos,
  seccionDePartido,
  estaAbierto,
  estaDisponibleParaPronosticar,
  formatearFechaHora,
} from "../hooks/usePronosticos";
import { obtenerRonda } from "../services/apiFootball";
import { clasificarAcierto } from "../scoring";
import { useNotificaciones } from "../hooks/useNotificaciones";
import SeccionPartidos from "../components/SeccionPartidos";
import { NotificationToast } from "../components/NotificationToast";
import { SkeletonPronosticos } from "../components/Skeleton";
import styles from "./Pronosticos.module.css";

const SECCIONES = [
  { key: "Grupo A",          label: "Grupo A",          color: "#6366f1" },
  { key: "Grupo B",          label: "Grupo B",          color: "#8b5cf6" },
  { key: "Grupo C",          label: "Grupo C",          color: "#06b6d4" },
  { key: "Grupo D",          label: "Grupo D",          color: "#10b981" },
  { key: "Grupo E",          label: "Grupo E",          color: "#f59e0b" },
  { key: "Grupo F",          label: "Grupo F",          color: "#ef4444" },
  { key: "Grupo G",          label: "Grupo G",          color: "#ec4899" },
  { key: "Grupo H",          label: "Grupo H",          color: "#14b8a6" },
  { key: "Grupo I",          label: "Grupo I",          color: "#f97316" },
  { key: "Grupo J",          label: "Grupo J",          color: "#a855f7" },
  { key: "Grupo K",          label: "Grupo K",          color: "#3b82f6" },
  { key: "Grupo L",          label: "Grupo L",          color: "#84cc16" },
  { key: "Dieciseisavos",    label: "Dieciseisavos",    color: "#f59e0b" },
  { key: "Octavos de final", label: "Octavos de Final", color: "#ef4444" },
  { key: "Cuartos de final", label: "Cuartos de Final", color: "#ec4899" },
  { key: "Semifinales",      label: "Semifinales",      color: "#8b5cf6" },
  { key: "3er puesto",       label: "3er Puesto",       color: "#14b8a6" },
  { key: "Final",            label: "Gran Final",       color: "#fbbf24" },
];

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "pendientes", label: "Pendientes" },
  { key: "guardados", label: "Guardados" },
  { key: "cerrados", label: "Cerrados" },
];

function tienePronostico(pronostico) {
  return pronostico?.local !== undefined && pronostico?.visitante !== undefined;
}

function fechaKey(fechaUtc) {
  const fecha = new Date(fechaUtc);
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fechaLabel(fechaUtc) {
  return new Date(fechaUtc).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function tiempoHasta(fechaUtc) {
  const diffMs = new Date(fechaUtc).getTime() - Date.now();
  if (diffMs <= 0) return "ya empezo";
  const minutos = Math.ceil(diffMs / (60 * 1000));
  if (minutos < 60) return `en ${minutos} min`;
  const horas = Math.ceil(minutos / 60);
  if (horas < 24) return `en ${horas} h`;
  const dias = Math.ceil(horas / 24);
  return `en ${dias} dia${dias === 1 ? "" : "s"}`;
}

function resultadoDisponible(partido) {
  return partido?.goals.home !== null && partido?.goals.away !== null;
}

export default function Pronosticos() {
  const user = useAuth();
  const [notificacionDismissed, setNotificacionDismissed] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("todas");
  const {
    partidos,
    pronosticos,
    savedPronosticos,
    guardando,
    guardadoOk,
    editando,
    cargando,
    error,
    errorValidacion,
    seccionAbierta,
    handleChange,
    activarEdicion,
    cancelarEdicion,
    guardar,
    setSeccionAbierta,
  } = usePronosticos(user?.uid);

  const { proximoACerrar, minutosRestantes } = useNotificaciones(partidos);

  const partidosAbiertos = partidos.filter(estaDisponibleParaPronosticar);
  const totalGuardados = partidos.filter(p => tienePronostico(savedPronosticos[p.fixture.id])).length;
  const pendientesAbiertos = partidosAbiertos.filter(p => !tienePronostico(savedPronosticos[p.fixture.id])).length;
  const proximoPartido = partidosAbiertos[0];
  const proximoHorario = proximoPartido ? formatearFechaHora(proximoPartido.fixture.date) : null;
  const opcionesFecha = partidos.reduce(
    (acc, partido) => {
      const key = fechaKey(partido.fixture.date);
      const existente = acc.find((opcion) => opcion.key === key);
      if (existente) {
        existente.count += 1;
        return acc;
      }
      return [...acc, { key, label: fechaLabel(partido.fixture.date), count: 1 }];
    },
    [{ key: "todas", label: "Todas las fechas", count: partidos.length }]
  );

  const partidosFiltrados = partidos.filter((p) => {
    const guardado = tienePronostico(savedPronosticos[p.fixture.id]);
    const abierto = estaDisponibleParaPronosticar(p);
    if (filtroFecha !== "todas" && fechaKey(p.fixture.date) !== filtroFecha) return false;
    if (filtro === "pendientes") return abierto && !guardado;
    if (filtro === "guardados") return guardado;
    if (filtro === "cerrados") return !estaAbierto(p.fixture.date);
    return true;
  });

  const historial = partidos
    .filter((partido) => tienePronostico(savedPronosticos[partido.fixture.id]) && resultadoDisponible(partido))
    .map((partido) => {
      const pronostico = savedPronosticos[partido.fixture.id];
      const ronda = obtenerRonda(partido.league?.round);
      const acierto = clasificarAcierto(
        pronostico,
        {
          local: partido.goals.home,
          visitante: partido.goals.away,
          ganadorEmpate: partido.ganadorEmpate || null,
        },
        ronda
      );

      return {
        partido,
        pronostico,
        ronda,
        puntos: acierto.puntos,
        tipo: acierto.tipo,
      };
    })
    .sort((a, b) => new Date(b.partido.fixture.date) - new Date(a.partido.fixture.date));

  const puntosHistorial = historial.reduce((acc, item) => acc + item.puntos, 0);
  const exactosHistorial = historial.filter((item) => item.tipo === "Exacto").length;
  const ganadoresHistorial = historial.filter((item) => item.tipo === "Ganador").length;
  const partidosConPuntos = historial.filter((item) => item.puntos > 0).length;
  const efectividad = historial.length ? Math.round((partidosConPuntos / historial.length) * 100) : 0;
  const rachaActual = historial.reduce((racha, item) => {
    if (racha.cortada || item.puntos === 0) return { ...racha, cortada: true };
    return { ...racha, total: racha.total + 1 };
  }, { total: 0, cortada: false }).total;
  const historialPorPartido = historial.reduce((acc, item) => {
    acc[item.partido.fixture.id] = item;
    return acc;
  }, {});

  const porSeccion = {};
  partidosFiltrados.forEach(p => {
    const sec = seccionDePartido(p);
    if (!porSeccion[sec]) porSeccion[sec] = [];
    porSeccion[sec].push(p);
  });

  if (cargando) return <SkeletonPronosticos />;
  if (error) return <div className={styles.errorMsg}>{error}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Mi pronóstico</h2>
        <p className={styles.sub}>Podés cargar o modificar hasta 1 hora antes de cada partido.</p>
      </div>

      <section className={styles.resumen} aria-label="Resumen de pronosticos">
        <div className={styles.stat}>
          <span className={styles.statLabel}>Pendientes abiertos</span>
          <strong className={styles.statValue}>{pendientesAbiertos}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Guardados</span>
          <strong className={styles.statValue}>{totalGuardados}/{partidos.length}</strong>
        </div>
        <div className={styles.statWide}>
          <span className={styles.statLabel}>Proximo partido</span>
          {proximoPartido ? (
            <strong className={styles.nextMatch}>
              {proximoPartido.teams.home.name} vs {proximoPartido.teams.away.name}
              <span>{proximoHorario.fecha} · {proximoHorario.hora} · {tiempoHasta(proximoPartido.fixture.date)}</span>
            </strong>
          ) : (
            <strong className={styles.nextMatch}>No quedan partidos abiertos</strong>
          )}
        </div>
      </section>

      <section className={styles.estadisticas} aria-label="Estadisticas personales">
        <div className={styles.stat}>
          <span className={styles.statLabel}>Puntos obtenidos</span>
          <strong className={styles.statValue}>{puntosHistorial}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Exactos</span>
          <strong className={styles.statValue}>{exactosHistorial}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Ganadores</span>
          <strong className={styles.statValue}>{ganadoresHistorial}</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Efectividad</span>
          <strong className={styles.statValue}>{efectividad}%</strong>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Racha sumando</span>
          <strong className={styles.statValue}>{rachaActual}</strong>
        </div>
      </section>

      <div className={styles.filtros} aria-label="Filtrar partidos">
        {FILTROS.map((opcion) => (
          <button
            key={opcion.key}
            className={`${styles.filtroBtn} ${filtro === opcion.key ? styles.filtroActivo : ""}`}
            onClick={() => setFiltro(opcion.key)}
          >
            {opcion.label}
          </button>
        ))}
      </div>

      <div className={styles.filtrosFecha} aria-label="Filtrar por fecha">
        {opcionesFecha.map((opcion) => (
          <button
            key={opcion.key}
            className={`${styles.filtroFechaBtn} ${filtroFecha === opcion.key ? styles.filtroActivo : ""}`}
            onClick={() => setFiltroFecha(opcion.key)}
          >
            {opcion.label}
            <span>{opcion.count}</span>
          </button>
        ))}
      </div>

      {partidosFiltrados.length === 0 && (
        <div className={styles.emptyState}>No hay partidos para este filtro.</div>
      )}

      {SECCIONES.filter(s => porSeccion[s.key]?.length).map(seccion => (
        <SeccionPartidos
          key={seccion.key}
          seccion={seccion}
          partidos={porSeccion[seccion.key] ?? []}
          pronosticos={pronosticos}
          savedPronosticos={savedPronosticos}
          editando={editando}
          guardando={guardando}
          guardadoOk={guardadoOk}
          historialPorPartido={historialPorPartido}
          abierta={seccionAbierta === seccion.key}
          onToggleSeccion={() => setSeccionAbierta(seccionAbierta === seccion.key ? null : seccion.key)}
          onActivarEdicion={activarEdicion}
          onCancelarEdicion={cancelarEdicion}
          onGuardar={(id) => guardar(id, user?.uid)}
          onChange={handleChange}
        />
      ))}

      {errorValidacion && (
        <div className={styles.toastError} style={{
          position: "fixed",
          top: "20px",
          left: "20px",
          right: "20px",
          maxWidth: "calc(100vw - 40px)",
          background: "#ef4444",
          color: "white",
          padding: "12px 16px",
          borderRadius: "6px",
          fontSize: "14px",
          zIndex: "1000",
          animation: "fadeIn 0.3s ease-in-out"
        }}>
          {errorValidacion}
        </div>
      )}

      {!notificacionDismissed && (
        <NotificationToast
          partido={proximoACerrar}
          minutosRestantes={minutosRestantes}
          onDismiss={() => setNotificacionDismissed(true)}
        />
      )}
    </div>
  );
}
