// Sistema de puntaje acordado
// Resultado exacto / Ganador correcto

export const SCORING = {
  "Fase de grupos":  { exact: 3, winner: 1 },
  "Dieciseisavos":   { exact: 5, winner: 2 },
  "Octavos de final":{ exact: 5, winner: 2 },
  "Cuartos de final":{ exact: 5, winner: 2 },
  "Semifinales":     { exact: 8, winner: 3 },
  "3er puesto":      { exact: 8, winner: 3 },
  "Final":           { exact: 8, winner: 3 },
};

export const EMPATE_EXACTO_SIN_CLASIFICADO = 3;

function esEliminatoria(ronda) {
  return ronda !== "Fase de grupos";
}

function ganadorDeMarcador(datos) {
  if (datos.local > datos.visitante) return "local";
  if (datos.visitante > datos.local) return "visitante";
  return datos.ganadorEmpate || "empate";
}

export function clasificarAcierto(pronostico, resultado, ronda) {
  if (!pronostico || resultado.local === null || resultado.visitante === null) {
    return { puntos: 0, tipo: "Sin puntos" };
  }

  const scoring = SCORING[ronda] ?? SCORING["Fase de grupos"];

  const exacto =
    pronostico.local === resultado.local &&
    pronostico.visitante === resultado.visitante;
  const requiereGanadorEmpate =
    esEliminatoria(ronda) &&
    resultado.local === resultado.visitante &&
    resultado.ganadorEmpate;

  const ganadorReal = ganadorDeMarcador(resultado);
  const ganadorPron = ganadorDeMarcador(pronostico);

  if (exacto && (!requiereGanadorEmpate || ganadorReal === ganadorPron)) {
    return { puntos: scoring.exact, tipo: "Exacto" };
  }

  if (exacto && requiereGanadorEmpate && ganadorReal !== ganadorPron) {
    return { puntos: EMPATE_EXACTO_SIN_CLASIFICADO, tipo: "Empate exacto" };
  }

  if (ganadorReal === ganadorPron) return { puntos: scoring.winner, tipo: "Ganador" };
  return { puntos: 0, tipo: "Sin puntos" };
}

export function calcularPuntos(pronostico, resultado, ronda) {
  return clasificarAcierto(pronostico, resultado, ronda).puntos;
}
