import { useEffect, useState } from "react";
import { partidoTieneEquiposDefinidos } from "../services/apiFootball";

const CIERRE_MINUTOS = 60;

/**
 * Hook para detectar pronósticos que cierran pronto (< 15 minutos)
 * Retorna el partido más cercano a cerrar y el tiempo en minutos
 */
export function useNotificaciones(partidos) {
  const [proximoACerrar, setProximoACerrar] = useState(null);
  const [minutosRestantes, setMinutosRestantes] = useState(null);

  useEffect(() => {
    const actualizar = () => {
      const ahora = Date.now();
      let proximoPartido = null;
      let menorTiempo = Infinity;

      for (const partido of partidos) {
        if (!partidoTieneEquiposDefinidos(partido)) continue;

        const fechaCierre = new Date(partido.fixture.date).getTime() - CIERRE_MINUTOS * 60 * 1000;
        const tiempoRestante = fechaCierre - ahora;

        // Si aún no pasó el cierre y está en los próximos 15 minutos
        if (tiempoRestante > 0 && tiempoRestante < 15 * 60 * 1000) {
          if (tiempoRestante < menorTiempo) {
            menorTiempo = tiempoRestante;
            proximoPartido = partido;
          }
        }
      }

      if (proximoPartido) {
        const minutos = Math.max(1, Math.ceil(menorTiempo / 60000));
        setProximoACerrar(proximoPartido);
        setMinutosRestantes(minutos);
      } else {
        setProximoACerrar(null);
        setMinutosRestantes(null);
      }
    };

    actualizar();
    const intervalo = setInterval(actualizar, 30000); // Actualizar cada 30 segundos

    return () => clearInterval(intervalo);
  }, [partidos]);

  return { proximoACerrar, minutosRestantes };
}
