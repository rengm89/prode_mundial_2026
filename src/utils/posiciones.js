export function agregarPosicionesCompartidas(tabla) {
  let posicionActual = 0;
  let puntosPrevios = null;

  return tabla.map((fila) => {
    if (fila.puntos !== puntosPrevios) {
      posicionActual += 1;
      puntosPrevios = fila.puntos;
    }

    return { ...fila, posicion: posicionActual };
  });
}
