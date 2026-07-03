import { useEffect, useState, useCallback, useRef } from "react";
import { obtenerFixture, obtenerRonda, partidoTieneEquiposDefinidos } from "../services/apiFootball";
import { guardarPronostico, obtenerPronosticosUsuario, limpiarPronosticosNull } from "../services/firestore";

const CIERRE_MINUTOS = 60;
const MS_48H = 48 * 60 * 60 * 1000;

export const estaAbierto = (fechaUtc) => {
  return Date.now() < new Date(fechaUtc).getTime() - CIERRE_MINUTOS * 60 * 1000;
};

export const estaDisponibleParaPronosticar = (partido) => {
  return partidoTieneEquiposDefinidos(partido) && estaAbierto(partido.fixture.date);
};

export const formatearFechaHora = (fechaUtc) => {
  const d = new Date(fechaUtc);
  const fecha = d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
};

export const estadoSeccion = (partidos) => {
  const partidosDisponibles = partidos.filter(partidoTieneEquiposDefinidos);
  if (partidosDisponibles.length === 0) return "noDisponible";

  const ahora = Date.now();
  for (const p of partidosDisponibles) {
    const inicio = new Date(p.fixture.date).getTime();
    const diffMs = inicio - ahora;
    if (diffMs > 0 && diffMs < CIERRE_MINUTOS * 60 * 1000) continue;
    if (diffMs <= 0) continue;
    if (diffMs < 24 * 60 * 60 * 1000) return "hoy";
    if (diffMs < MS_48H) return "proximo";
  }
  return "cerrado";
};

export const diasParaProximo = (partidos) => {
  const ahora = Date.now();
  let minMs = Infinity;
  for (const p of partidos.filter(partidoTieneEquiposDefinidos)) {
    const diffMs = new Date(p.fixture.date).getTime() - ahora;
    if (diffMs > CIERRE_MINUTOS * 60 * 1000 && diffMs < minMs) minMs = diffMs;
  }
  if (minMs === Infinity) return null;
  return Math.ceil(minMs / (24 * 60 * 60 * 1000));
};

export const seccionDePartido = (p) => {
  const ronda = obtenerRonda(p.league?.round);
  return ronda === "Fase de grupos" ? `Grupo ${p.group}` : ronda;
};

function esEliminatoria(partido) {
  return obtenerRonda(partido?.league?.round) !== "Fase de grupos";
}

export const equiposDeSeccion = (partidos) => {
  if (partidos.length > 0 && partidos.every((p) => !partidoTieneEquiposDefinidos(p))) {
    return "Equipos por definirse";
  }

  const equipos = new Set();
  partidos.forEach(p => {
    equipos.add(p.teams.home.name);
    equipos.add(p.teams.away.name);
  });
  return [...equipos].slice(0, 4).join(" · ");
};

export function usePronosticos(userId) {
  const [partidos, setPartidos] = useState([]);
  const [pronosticos, setPronosticos] = useState({});
  const [savedPronosticos, setSavedPronosticos] = useState({});
  const [guardando, setGuardando] = useState({});
  const [guardadoOk, setGuardadoOk] = useState({});
  const [editando, setEditando] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [errorValidacion, setErrorValidacion] = useState("");
  const [seccionAbierta, setSeccionAbierta] = useState(null);

  const pronosticosRef = useRef(pronosticos);
  const partidosRef = useRef(partidos);

  useEffect(() => {
    pronosticosRef.current = pronosticos;
  }, [pronosticos]);

  useEffect(() => {
    partidosRef.current = partidos;
  }, [partidos]);

  const cargarDatos = useCallback(async () => {
    if (!userId) return;
    setCargando(true);
    setError("");
    try {
      await limpiarPronosticosNull(userId);

      const [fixture, misPronosticos] = await Promise.all([
        obtenerFixture(),
        obtenerPronosticosUsuario(userId),
      ]);

      const ordenados = [...fixture].sort(
        (a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)
      );
      setPartidos(ordenados);

      const mapa = {};
      misPronosticos.forEach(p => {
        if (p.local !== null && p.local !== undefined && p.visitante !== null && p.visitante !== undefined) {
          mapa[p.partidoId] = {
            local: p.local,
            visitante: p.visitante,
            ganadorEmpate: p.ganadorEmpate || null,
          };
        }
      });
      setPronosticos(mapa);
      setSavedPronosticos(mapa);
      pronosticosRef.current = mapa;

      const proximo = ordenados.find(estaDisponibleParaPronosticar);
      if (proximo) setSeccionAbierta(seccionDePartido(proximo));
      else setSeccionAbierta("Grupo A");
    } catch {
      setError("No se pudo cargar el fixture.");
    } finally {
      setCargando(false);
    }
  }, [userId]);

  useEffect(() => {
    // La carga inicial sincroniza Firestore con estado local del hook.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, [cargarDatos]);

  // Validación robusta: limita a 0-30 y valida el rango
  const handleChange = useCallback((partidoId, campo, valor) => {
    if (campo === "ganadorEmpate") {
      setPronosticos(prev => ({
        ...prev,
        [partidoId]: { ...prev[partidoId], ganadorEmpate: valor || null },
      }));
      return;
    }

    let num = "";
    
    if (valor !== "") {
      const parsed = parseInt(valor, 10);
      
      // Si no es un número válido, ignorar
      if (isNaN(parsed)) return;
      
      // Si está fuera de rango, mostrar error
      if (parsed < 0 || parsed > 30) {
        setErrorValidacion("Los goles deben estar entre 0 y 30.");
        setTimeout(() => setErrorValidacion(""), 2000);
        return;
      }
      
      num = parsed;
    }
    
    setPronosticos(prev => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [campo]: num },
    }));
  }, []);

  const activarEdicion = useCallback((partidoId) => {
    setEditando(prev => ({ ...prev, [partidoId]: true }));
  }, []);

  const cancelarEdicion = useCallback((partidoId) => {
    setPronosticos(prev => ({
      ...prev,
      [partidoId]: savedPronosticos[partidoId]
        ? { ...savedPronosticos[partidoId] }
        : undefined,
    }));
    setEditando(prev => ({ ...prev, [partidoId]: false }));
  }, [savedPronosticos]);

  const guardar = useCallback(async (partidoId, userId) => {
    const partido = partidosRef.current.find((p) => p.fixture.id === partidoId);
    if (partido && !partidoTieneEquiposDefinidos(partido)) {
      setErrorValidacion("Este partido todavia no tiene equipos definidos.");
      setTimeout(() => setErrorValidacion(""), 3000);
      return;
    }

    const pron = pronosticosRef.current[partidoId];
    const localVacio = pron?.local === "" || pron?.local === undefined;
    const visitanteVacio = pron?.visitante === "" || pron?.visitante === undefined;

    if (localVacio !== visitanteVacio) {
      setErrorValidacion("Ambos resultados deben estar completos o ambos vacíos.");
      setTimeout(() => setErrorValidacion(""), 3000);
      return;
    }

    const requiereGanadorEmpate =
      partido &&
      esEliminatoria(partido) &&
      !localVacio &&
      Number(pron.local) === Number(pron.visitante);

    if (requiereGanadorEmpate && !pron?.ganadorEmpate) {
      setErrorValidacion("Elegí quién clasifica en caso de empate.");
      setTimeout(() => setErrorValidacion(""), 3000);
      return;
    }

    setGuardando(p => ({ ...p, [partidoId]: true }));
    try {
      const local = localVacio ? "" : pron.local;
      const visitante = visitanteVacio ? "" : pron.visitante;
      const ganadorEmpate = requiereGanadorEmpate ? pron.ganadorEmpate : null;

      await guardarPronostico(userId, partidoId, local, visitante, ganadorEmpate);

      if (localVacio && visitanteVacio) {
        setSavedPronosticos(prev => {
          const nuevoState = { ...prev };
          delete nuevoState[partidoId];
          return nuevoState;
        });
      } else {
        const valorGuardado = { local: pron.local, visitante: pron.visitante, ganadorEmpate };
        setSavedPronosticos(prev => ({ ...prev, [partidoId]: valorGuardado }));
      }

      setEditando(prev => ({ ...prev, [partidoId]: false }));
      setGuardadoOk(p => ({ ...p, [partidoId]: true }));
      setTimeout(() => setGuardadoOk(p => ({ ...p, [partidoId]: false })), 2000);
    } finally {
      setGuardando(p => ({ ...p, [partidoId]: false }));
    }
  }, []);

  return {
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
    setErrorValidacion,
  };
}
