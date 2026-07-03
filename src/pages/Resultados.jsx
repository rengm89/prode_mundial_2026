import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  eliminarEquiposPartido,
  eliminarResultado,
  esAdministrador,
  guardarEquiposPartido,
  guardarResultado,
  obtenerEquiposPartidosFirestore,
  obtenerResultadosFirestore,
} from "../services/firestore";
import { obtenerFixture, obtenerRonda } from "../services/apiFootball";
import { FIXTURE_2026, fixtureToApiFormat } from "../services/fixture2026";
import styles from "./Resultados.module.css";

function formatearFecha(fechaUtc) {
  return new Date(fechaUtc).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RONDAS_ORDEN = [
  "Fase de grupos",
  "Dieciseisavos",
  "Octavos de final",
  "Cuartos de final",
  "Semifinales",
  "3er puesto",
  "Final",
];

export default function Resultados() {
  const user = useAuth();
  const navigate = useNavigate();

  const [acceso, setAcceso] = useState(null); // null=cargando, false=sin acceso, true=ok
  const [partidos, setPartidos] = useState([]);
  const [resultados, setResultados] = useState({});
  const [equiposAsignados, setEquiposAsignados] = useState({});
  const [editando, setEditando] = useState(null); // fixtureId del partido en edicion
  const [equiposEditando, setEquiposEditando] = useState(null);
  const [inputLocal, setInputLocal] = useState("");
  const [inputVisitante, setInputVisitante] = useState("");
  const [inputGanadorEmpate, setInputGanadorEmpate] = useState("");
  const [inputEquipoLocal, setInputEquipoLocal] = useState("");
  const [inputEquipoVisitante, setInputEquipoVisitante] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok"|"error", texto }
  const [filtroRonda, setFiltroRonda] = useState("Todos");
  const [soloSinResultado, setSoloSinResultado] = useState(false);

  const partidosBase = useMemo(() => FIXTURE_2026.map(fixtureToApiFormat), []);
  const partidosBasePorId = useMemo(
    () => new Map(partidosBase.map((partido) => [partido.fixture.id, partido])),
    [partidosBase]
  );

  useEffect(() => {
    async function verificar() {
      if (!user?.uid) return;
      const admin = await esAdministrador(user.uid);
      if (!admin) {
        setAcceso(false);
        return;
      }

      const [fixture, res, equipos] = await Promise.all([
        obtenerFixture(),
        obtenerResultadosFirestore(),
        obtenerEquiposPartidosFirestore(),
      ]);
      setPartidos(fixture);
      setResultados(res);
      setEquiposAsignados(equipos);
      setAcceso(true);
    }
    verificar();
  }, [user?.uid]);

  useEffect(() => {
    if (acceso === false) navigate("/inicio");
  }, [acceso, navigate]);

  const mostrar = useMemo(() => {
    return partidos
      .filter((p) => {
        const ronda = obtenerRonda(p.league?.round);
        if (filtroRonda !== "Todos" && ronda !== filtroRonda) return false;
        if (soloSinResultado && resultados[p.fixture.id] !== undefined) return false;
        return true;
      })
      .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
  }, [partidos, filtroRonda, soloSinResultado, resultados]);

  function aplicarEquiposEnPartidos(partidoId, equipos) {
    const base = partidosBasePorId.get(partidoId);

    setPartidos((prev) =>
      prev.map((partido) => {
        if (partido.fixture.id !== partidoId) return partido;

        return {
          ...partido,
          teams: {
            home: {
              ...partido.teams.home,
              name: equipos?.local || base?.teams.home.name || partido.teams.home.name,
            },
            away: {
              ...partido.teams.away,
              name: equipos?.visitante || base?.teams.away.name || partido.teams.away.name,
            },
          },
        };
      })
    );
  }

  function abrirEdicion(partido) {
    const r = resultados[partido.fixture.id];
    setInputLocal(r !== undefined ? String(r.local) : "");
    setInputVisitante(r !== undefined ? String(r.visitante) : "");
    setInputGanadorEmpate(r?.ganadorEmpate || "");
    setEditando(partido.fixture.id);
    setEquiposEditando(null);
    setMensaje(null);
  }

  function cancelar() {
    setEditando(null);
    setInputLocal("");
    setInputVisitante("");
    setInputGanadorEmpate("");
  }

  function abrirEdicionEquipos(partido) {
    const equipos = equiposAsignados[partido.fixture.id];
    setInputEquipoLocal(equipos?.local || partido.teams.home.name);
    setInputEquipoVisitante(equipos?.visitante || partido.teams.away.name);
    setEquiposEditando(partido.fixture.id);
    setEditando(null);
    setMensaje(null);
  }

  function cancelarEquipos() {
    setEquiposEditando(null);
    setInputEquipoLocal("");
    setInputEquipoVisitante("");
  }

  async function guardar(partidoId) {
    if (inputLocal === "" || inputVisitante === "") {
      setMensaje({ tipo: "error", texto: "Completa ambos marcadores." });
      return;
    }
    const l = Number(inputLocal);
    const v = Number(inputVisitante);
    const partido = partidos.find((p) => p.fixture.id === partidoId);
    const ronda = obtenerRonda(partido?.league?.round);
    const esEliminatoria = ronda !== "Fase de grupos";
    if (!Number.isInteger(l) || !Number.isInteger(v) || l < 0 || v < 0) {
      setMensaje({ tipo: "error", texto: "Los goles deben ser numeros enteros no negativos." });
      return;
    }
    if (esEliminatoria && l === v && !inputGanadorEmpate) {
      setMensaje({ tipo: "error", texto: "Indica quien clasifico en caso de empate." });
      return;
    }
    setGuardando(true);
    try {
      const ganadorEmpate = esEliminatoria && l === v ? inputGanadorEmpate : null;
      await guardarResultado(partidoId, l, v, ganadorEmpate);
      setResultados((prev) => ({ ...prev, [partidoId]: { local: l, visitante: v, ganadorEmpate } }));
      setMensaje({ tipo: "ok", texto: "Resultado guardado." });
      setEditando(null);
    } catch {
      setMensaje({ tipo: "error", texto: "Error al guardar. Intenta de nuevo." });
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(partidoId) {
    setGuardando(true);
    try {
      await eliminarResultado(partidoId);
      setResultados((prev) => {
        const next = { ...prev };
        delete next[partidoId];
        return next;
      });
      setMensaje({ tipo: "ok", texto: "Resultado eliminado." });
      setEditando(null);
    } catch {
      setMensaje({ tipo: "error", texto: "Error al eliminar." });
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEquipos(partidoId) {
    const local = inputEquipoLocal.trim();
    const visitante = inputEquipoVisitante.trim();

    if (!local || !visitante) {
      setMensaje({ tipo: "error", texto: "Completa ambos equipos." });
      return;
    }

    setGuardando(true);
    try {
      await guardarEquiposPartido(partidoId, local, visitante);
      const equipos = { local, visitante };
      setEquiposAsignados((prev) => ({ ...prev, [partidoId]: equipos }));
      aplicarEquiposEnPartidos(partidoId, equipos);
      setMensaje({ tipo: "ok", texto: "Equipos asignados." });
      cancelarEquipos();
    } catch {
      setMensaje({ tipo: "error", texto: "Error al guardar equipos." });
    } finally {
      setGuardando(false);
    }
  }

  async function borrarEquipos(partidoId) {
    setGuardando(true);
    try {
      await eliminarEquiposPartido(partidoId);
      setEquiposAsignados((prev) => {
        const next = { ...prev };
        delete next[partidoId];
        return next;
      });
      aplicarEquiposEnPartidos(partidoId, null);
      setMensaje({ tipo: "ok", texto: "Asignacion de equipos eliminada." });
      cancelarEquipos();
    } catch {
      setMensaje({ tipo: "error", texto: "Error al eliminar equipos." });
    } finally {
      setGuardando(false);
    }
  }

  const cargados = Object.keys(resultados).length;
  const total = partidos.length || partidosBase.length;
  const progreso = total > 0 ? (cargados / total) * 100 : 0;

  if (acceso === null) return <div className={styles.loading}>Verificando acceso...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Cargar resultados</h2>
        <p className={styles.sub}>
          Carga el marcador final de cada partido. La tabla de posiciones se actualiza automaticamente.
        </p>
        <div className={styles.progreso}>
          <span>{cargados} de {total} partidos con resultado</span>
          <div className={styles.barraContenedor}>
            <div className={styles.barraFill} style={{ width: `${progreso}%` }} />
          </div>
        </div>
      </div>

      {mensaje && (
        <div className={`${styles.mensaje} ${mensaje.tipo === "ok" ? styles.mensajeOk : styles.mensajeError}`}>
          {mensaje.texto}
        </div>
      )}

      <div className={styles.filtros}>
        <div className={styles.filtroRondas}>
          {["Todos", ...RONDAS_ORDEN].map((r) => (
            <button
              key={r}
              className={`${styles.chip} ${filtroRonda === r ? styles.chipActivo : ""}`}
              onClick={() => setFiltroRonda(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={soloSinResultado}
            onChange={(e) => setSoloSinResultado(e.target.checked)}
          />
          Solo sin resultado
        </label>
      </div>

      <div className={styles.lista}>
        {mostrar.length === 0 && (
          <p className={styles.vacio}>No hay partidos con ese filtro.</p>
        )}
        {mostrar.map((p) => {
          const id = p.fixture.id;
          const ronda = obtenerRonda(p.league?.round);
          const resultado = resultados[id];
          const enEdicion = editando === id;
          const enEdicionEquipos = equiposEditando === id;
          const esEliminatoria = ronda !== "Fase de grupos";
          const tieneEquiposAsignados = equiposAsignados[id] !== undefined;
          const resultadoEmpatado = resultado?.local === resultado?.visitante;
          const inputEmpatado =
            inputLocal !== "" &&
            inputVisitante !== "" &&
            Number(inputLocal) === Number(inputVisitante);
          const nombreGanadorEmpate = (valor) => {
            if (valor === "local") return p.teams.home.name;
            if (valor === "visitante") return p.teams.away.name;
            return "";
          };

          return (
            <div key={id} className={`${styles.card} ${resultado !== undefined ? styles.cardCon : ""}`}>
              <div className={styles.cardTop}>
                <span className={styles.ronda}>{ronda}</span>
                <span className={styles.fecha}>{formatearFecha(p.fixture.date)}</span>
              </div>

              <div className={styles.equipos}>
                <span className={styles.equipo}>{p.teams.home.name}</span>
                <div className={styles.marcador}>
                  {resultado !== undefined ? (
                    <span className={styles.resultadoCargado}>
                      {resultado.local} - {resultado.visitante}
                      {esEliminatoria && resultadoEmpatado && resultado.ganadorEmpate && (
                        <small>Clasifico {nombreGanadorEmpate(resultado.ganadorEmpate)}</small>
                      )}
                    </span>
                  ) : (
                    <span className={styles.sinResultado}>vs</span>
                  )}
                </div>
                <span className={styles.equipo}>{p.teams.away.name}</span>
              </div>

              {enEdicionEquipos && (
                <div className={styles.form}>
                  <div className={styles.inputsEquipos}>
                    <div className={styles.inputEquipoGroup}>
                      <label>Local</label>
                      <input
                        type="text"
                        value={inputEquipoLocal}
                        onChange={(e) => setInputEquipoLocal(e.target.value)}
                        className={styles.inputEquipo}
                        autoFocus
                      />
                    </div>
                    <div className={styles.inputEquipoGroup}>
                      <label>Visitante</label>
                      <input
                        type="text"
                        value={inputEquipoVisitante}
                        onChange={(e) => setInputEquipoVisitante(e.target.value)}
                        className={styles.inputEquipo}
                      />
                    </div>
                  </div>
                  <div className={styles.acciones}>
                    <button
                      className={styles.btnGuardar}
                      onClick={() => guardarEquipos(id)}
                      disabled={guardando}
                    >
                      {guardando ? "Guardando..." : "Guardar equipos"}
                    </button>
                    {tieneEquiposAsignados && (
                      <button
                        className={styles.btnBorrar}
                        onClick={() => borrarEquipos(id)}
                        disabled={guardando}
                      >
                        Restablecer
                      </button>
                    )}
                    <button className={styles.btnCancelar} onClick={cancelarEquipos} disabled={guardando}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {enEdicion && (
                <div className={styles.form}>
                  <div className={styles.inputs}>
                    <div className={styles.inputGroup}>
                      <label>{p.teams.home.name}</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={inputLocal}
                        onChange={(e) => setInputLocal(e.target.value)}
                        className={styles.inputGol}
                        autoFocus
                      />
                    </div>
                    <span className={styles.guion}>-</span>
                    <div className={styles.inputGroup}>
                      <label>{p.teams.away.name}</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={inputVisitante}
                        onChange={(e) => setInputVisitante(e.target.value)}
                        className={styles.inputGol}
                      />
                    </div>
                  </div>
                  {esEliminatoria && inputEmpatado && (
                    <div className={styles.desempateResultado}>
                      <span>Clasifico</span>
                      <label>
                        <input
                          type="radio"
                          name={`resultadoGanadorEmpate-${id}`}
                          value="local"
                          checked={inputGanadorEmpate === "local"}
                          onChange={(e) => setInputGanadorEmpate(e.target.value)}
                        />
                        {p.teams.home.name}
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`resultadoGanadorEmpate-${id}`}
                          value="visitante"
                          checked={inputGanadorEmpate === "visitante"}
                          onChange={(e) => setInputGanadorEmpate(e.target.value)}
                        />
                        {p.teams.away.name}
                      </label>
                    </div>
                  )}
                  <div className={styles.acciones}>
                    <button
                      className={styles.btnGuardar}
                      onClick={() => guardar(id)}
                      disabled={guardando}
                    >
                      {guardando ? "Guardando..." : "Guardar"}
                    </button>
                    {resultado !== undefined && (
                      <button
                        className={styles.btnBorrar}
                        onClick={() => borrar(id)}
                        disabled={guardando}
                      >
                        Borrar
                      </button>
                    )}
                    <button className={styles.btnCancelar} onClick={cancelar} disabled={guardando}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {!enEdicion && !enEdicionEquipos && (
                <div className={styles.botonesCard}>
                  <button className={styles.btnEditar} onClick={() => abrirEdicion(p)}>
                    {resultado !== undefined ? "Editar resultado" : "Cargar resultado"}
                  </button>
                  {esEliminatoria && (
                    <button className={styles.btnEditar} onClick={() => abrirEdicionEquipos(p)}>
                      {tieneEquiposAsignados ? "Editar equipos" : "Asignar equipos"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
