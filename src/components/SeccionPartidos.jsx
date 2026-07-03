import { memo } from "react";
import {
  estadoSeccion,
  diasParaProximo,
  equiposDeSeccion,
  estaAbierto,
} from "../hooks/usePronosticos";
import { partidoTieneEquiposDefinidos } from "../services/apiFootball";
import PartidoCard from "./PartidoCard";
import styles from "../pages/Pronosticos.module.css";

const SeccionPartidos = memo(({
  seccion,
  partidos,
  pronosticos,
  savedPronosticos,
  editando,
  guardando,
  guardadoOk,
  historialPorPartido = {},
  abierta,
  onToggleSeccion,
  onActivarEdicion,
  onCancelarEdicion,
  onGuardar,
  onChange,
}) => {
  const estado = estadoSeccion(partidos);
  const dias = diasParaProximo(partidos);
  const equipos = equiposDeSeccion(partidos);
  const partidosDisponibles = partidos.filter(partidoTieneEquiposDefinidos);
  const totalDisponibles = partidosDisponibles.length || partidos.length;
  const pronCargados = partidosDisponibles.filter(
    (p) => savedPronosticos[p.fixture.id]?.local !== undefined
  ).length;

  const dotClass = estado === "hoy" ? styles.dotAmber : estado === "proximo" ? styles.dotGreen : styles.dotGray;
  const badgeClass = estado === "hoy" ? styles.badgeAmber : estado === "proximo" ? styles.badgeGreen : styles.badgeGray;
  const borderColor = estado === "hoy" ? "#f59e0b" : estado === "proximo" ? "#22c55e" : "#484f58";
  const badgeTexto = estado === "hoy"
    ? "Partido hoy"
    : estado === "proximo"
    ? `En ${dias} dia${dias === 1 ? "" : "s"}`
    : estado === "noDisponible"
    ? "No disponible"
    : `${pronCargados}/${totalDisponibles} cargados`;

  return (
    <div className={styles.card}>
      <button
        className={styles.cardHeader}
        style={{ borderLeftColor: borderColor }}
        onClick={() => onToggleSeccion()}
        aria-expanded={abierta}
        aria-label={`${seccion.label}: ${badgeTexto}`}
      >
        <div className={`${styles.dot} ${dotClass}`} />
        <div className={styles.cardHeaderLeft}>
          <span className={styles.cardTitulo}>{seccion.label}</span>
          <span className={styles.cardEquipos}>{equipos}</span>
        </div>
        <div className={styles.cardHeaderRight}>
          <span className={`${styles.badge} ${badgeClass}`}>{badgeTexto}</span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(pronCargados / totalDisponibles) * 100}%`, background: borderColor }}
            />
          </div>
          <span className={styles.chevron}>{abierta ? "^" : "v"}</span>
        </div>
      </button>

      {abierta && (
        <div className={styles.cardBody}>
          {partidos.map((partido) => {
            const disponible = partidoTieneEquiposDefinidos(partido);

            return (
              <PartidoCard
                key={partido.fixture.id}
                partido={partido}
                pronostico={pronosticos[partido.fixture.id] ?? {}}
                savedPronostico={savedPronosticos[partido.fixture.id]}
                abierto={disponible && estaAbierto(partido.fixture.date)}
                disponible={disponible}
                editando={editando[partido.fixture.id]}
                guardando={guardando[partido.fixture.id]}
                guardadoOk={guardadoOk[partido.fixture.id]}
                historialItem={historialPorPartido[partido.fixture.id]}
                onActivarEdicion={onActivarEdicion}
                onCancelarEdicion={onCancelarEdicion}
                onGuardar={onGuardar}
                onChange={onChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

SeccionPartidos.displayName = "SeccionPartidos";

export default SeccionPartidos;
