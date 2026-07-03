import { memo } from "react";
import { SCORING } from "../scoring";
import { codigoBandera } from "../services/banderas";
import { formatearFechaHora } from "../hooks/usePronosticos";
import { obtenerRonda } from "../services/apiFootball";
import styles from "../pages/Pronosticos.module.css";

const PartidoCard = memo(({
  partido,
  pronostico = {},
  savedPronostico,
  abierto: estaAbiertoBool,
  disponible = true,
  editando,
  guardando,
  guardadoOk,
  historialItem,
  onActivarEdicion,
  onCancelarEdicion,
  onGuardar,
  onChange,
}) => {
  const id = partido.fixture.id;
  const ronda = obtenerRonda(partido.league?.round);
  const scoring = SCORING[ronda];
  const { fecha, hora } = formatearFechaHora(partido.fixture.date);
  const codeHome = codigoBandera(partido.teams.home.name);
  const codeAway = codigoBandera(partido.teams.away.name);
  const esEliminatoria = ronda !== "Fase de grupos";

  const tienePron = savedPronostico?.local !== undefined && savedPronostico?.visitante !== undefined;
  const enEdicion = editando || !tienePron;
  const marcadorEmpatado =
    pronostico.local !== "" &&
    pronostico.local !== undefined &&
    pronostico.visitante !== "" &&
    pronostico.visitante !== undefined &&
    Number(pronostico.local) === Number(pronostico.visitante);

  const textoGanadorEmpate = (valor) => {
    if (valor === "local") return partido.teams.home.name;
    if (valor === "visitante") return partido.teams.away.name;
    return "";
  };

  const detalleGanadorGuardado =
    esEliminatoria && savedPronostico?.ganadorEmpate
      ? `Clasifica ${textoGanadorEmpate(savedPronostico.ganadorEmpate)}`
      : "";

  const tipoHistorialClase = !historialItem
    ? ""
    : historialItem.puntos === 0
    ? styles.historialSinPuntos
    : historialItem.tipo === "Exacto"
    ? styles.historialExacto
    : historialItem.tipo === "Empate exacto"
    ? styles.historialEmpateExacto
    : styles.historialGanador;

  return (
    <div className={`${styles.partido} ${!estaAbiertoBool ? styles.cerrado : ""} ${historialItem ? styles.conHistorial : ""} ${!disponible ? styles.noDisponible : ""}`}>
      <div className={styles.partidoFecha}>{fecha} - {hora}</div>
      <div className={styles.partidoFila}>
        <div className={styles.equipo}>
          <span className={`fi fi-${codeHome} ${styles.bandera}`} />
          <span className={styles.nombreEquipo}>{partido.teams.home.name}</span>
        </div>

        <div className={styles.centro}>
          {!disponible ? (
            <div className={styles.noDisponibleLabel}>
              Equipos por definirse
            </div>
          ) : !estaAbiertoBool ? (
            <div className={styles.cerradoLabel}>
              <span>{tienePron ? `${savedPronostico.local} - ${savedPronostico.visitante}` : "-"}</span>
              {detalleGanadorGuardado && <small>{detalleGanadorGuardado}</small>}
              <span className={styles.lockIcon}>Cerrado</span>
            </div>
          ) : enEdicion ? (
            <div className={styles.pronosticoEditor}>
              <div className={styles.inputs}>
                <input
                  className={styles.scoreInput}
                  type="number"
                  min="0"
                  max="30"
                  value={pronostico.local ?? ""}
                  onChange={(e) => onChange(id, "local", e.target.value)}
                  placeholder="?"
                  aria-label={`Goles ${partido.teams.home.name}`}
                />
                <span className={styles.vs}>-</span>
                <input
                  className={styles.scoreInput}
                  type="number"
                  min="0"
                  max="30"
                  value={pronostico.visitante ?? ""}
                  onChange={(e) => onChange(id, "visitante", e.target.value)}
                  placeholder="?"
                  aria-label={`Goles ${partido.teams.away.name}`}
                />
              </div>

              {esEliminatoria && marcadorEmpatado && (
                <div className={styles.desempate}>
                  <span>Clasifica</span>
                  <div className={styles.desempateOpciones}>
                    <label className={styles.desempateOpcion}>
                      <input
                        type="radio"
                        name={`ganadorEmpate-${id}`}
                        value="local"
                        checked={pronostico.ganadorEmpate === "local"}
                        onChange={(e) => onChange(id, "ganadorEmpate", e.target.value)}
                      />
                      {partido.teams.home.name}
                    </label>
                    <label className={styles.desempateOpcion}>
                      <input
                        type="radio"
                        name={`ganadorEmpate-${id}`}
                        value="visitante"
                        checked={pronostico.ganadorEmpate === "visitante"}
                        onChange={(e) => onChange(id, "ganadorEmpate", e.target.value)}
                      />
                      {partido.teams.away.name}
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.guardadoLabel}>
              <span className={styles.guardadoScore}>
                {savedPronostico.local} - {savedPronostico.visitante}
              </span>
              {detalleGanadorGuardado && <small>{detalleGanadorGuardado}</small>}
            </div>
          )}
          <div className={styles.puntajeInfo}>
            {scoring.exact} pts / {scoring.winner} pt{scoring.winner > 1 ? "s" : ""}
          </div>
        </div>

        <div className={`${styles.equipo} ${styles.equipoDerecho}`}>
          <span className={styles.nombreEquipo}>{partido.teams.away.name}</span>
          <span className={`fi fi-${codeAway} ${styles.bandera}`} />
        </div>
      </div>

      {estaAbiertoBool && (
        <div className={styles.botonera}>
          {enEdicion ? (
            <>
              <button
                className={`${styles.btnGuardar} ${guardadoOk ? styles.btnOk : ""}`}
                onClick={() => onGuardar(id)}
                disabled={guardando}
                aria-label="Guardar pronostico"
              >
                {guardadoOk ? "Guardado" : guardando ? "Guardando..." : "Guardar"}
              </button>
              {tienePron && (
                <button
                  className={styles.btnCancelar}
                  onClick={() => onCancelarEdicion(id)}
                  disabled={guardando}
                  aria-label="Cancelar edicion"
                >
                  Cancelar
                </button>
              )}
            </>
          ) : (
            <button
              className={styles.btnEditar}
              onClick={() => onActivarEdicion(id)}
              aria-label={`Editar pronostico para ${partido.teams.home.name} vs ${partido.teams.away.name}`}
            >
              Editar
            </button>
          )}
        </div>
      )}

      {historialItem && (
        <div className={styles.historialEnPartido}>
          <div>
            <span>Tu pronostico</span>
            <strong>{historialItem.pronostico.local} - {historialItem.pronostico.visitante}</strong>
            {historialItem.pronostico.ganadorEmpate && (
              <small>Clasifica {textoGanadorEmpate(historialItem.pronostico.ganadorEmpate)}</small>
            )}
          </div>
          <div>
            <span>Resultado</span>
            <strong>{partido.goals.home} - {partido.goals.away}</strong>
            {partido.ganadorEmpate && (
              <small>Clasifico {textoGanadorEmpate(partido.ganadorEmpate)}</small>
            )}
          </div>
          <div className={`${styles.historialEnPartidoPuntos} ${tipoHistorialClase}`}>
            <span>Puntos</span>
            <strong>{historialItem.puntos}</strong>
            <small>{historialItem.tipo}</small>
          </div>
        </div>
      )}
    </div>
  );
});

PartidoCard.displayName = "PartidoCard";

export default PartidoCard;
