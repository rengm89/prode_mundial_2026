import { FIXTURE_2026, fixtureToApiFormat } from "./fixture2026";
import { obtenerEquiposPartidosFirestore, obtenerResultadosFirestore } from "./firestore";

export function obtenerRonda(rondaApi) {
  if (!rondaApi) return "Fase de grupos";
  const r = rondaApi.toLowerCase();
  if (r.includes("grupo") || r.includes("group") || r.includes("fase")) return "Fase de grupos";
  if (r.includes("dieciseisavos") || r.includes("ronda de 32") || r.includes("round of 32")) return "Dieciseisavos";
  if (r.includes("octavos") || r.includes("round of 16"))                return "Octavos de final";
  if (r.includes("cuartos") || r.includes("quarter"))                    return "Cuartos de final";
  if (r.includes("semifinal") || r.includes("semi"))                     return "Semifinales";
  if (r.includes("3er") || r.includes("tercer") || r.includes("third"))  return "3er puesto";
  if (r.includes("final"))                                                return "Final";
  return "Fase de grupos";
}

export function esEquipoPorDefinir(nombre) {
  const normalizado = String(nombre ?? "").toLowerCase();
  return (
    normalizado.includes("grupo") ||
    normalizado.includes("ganador") ||
    normalizado.includes("perdedor") ||
    normalizado.includes("mejor")
  );
}

export function partidoTieneEquiposDefinidos(partido) {
  const ronda = obtenerRonda(partido?.league?.round);
  if (ronda === "Fase de grupos") return true;

  return (
    !esEquipoPorDefinir(partido?.teams?.home?.name) &&
    !esEquipoPorDefinir(partido?.teams?.away?.name)
  );
}

// Usa el fixture local hardcodeado y combina con resultados cargados en Firestore
export async function obtenerFixture() {
  const local = FIXTURE_2026.map(fixtureToApiFormat);

  try {
    const [resultados, equiposPartidos] = await Promise.all([
      obtenerResultadosFirestore(),
      obtenerEquiposPartidosFirestore(),
    ]);

    return local.map((partido) => {
      const partidoId = partido.fixture.id;
      const resultado = resultados[partidoId];
      const equipos = equiposPartidos[partidoId];

      const actualizado = {
        ...partido,
        teams: {
          home: {
            ...partido.teams.home,
            name: equipos?.local || partido.teams.home.name,
          },
          away: {
            ...partido.teams.away,
            name: equipos?.visitante || partido.teams.away.name,
          },
        },
      };

      if (resultado !== undefined) {
        return {
          ...actualizado,
          goals: { home: resultado.local, away: resultado.visitante },
          ganadorEmpate: resultado.ganadorEmpate || null,
          fixture: {
            ...actualizado.fixture,
            status: {
              ...actualizado.fixture.status,
              short: "FT",
              long: "Match Finished",
              elapsed: 90,
            },
          },
        };
      }

      return actualizado;
    });
  } catch (error) {
    console.warn("No se pudieron obtener datos manuales de Firestore:", error.message);
  }

  return local;
}

// Mantenemos por compatibilidad
export async function obtenerResultados() {
  return FIXTURE_2026.map(fixtureToApiFormat);
}

export async function obtenerPartido(fixtureId) {
  const fixture = await obtenerFixture();
  return fixture.find((p) => p.fixture.id === fixtureId) ?? null;
}
