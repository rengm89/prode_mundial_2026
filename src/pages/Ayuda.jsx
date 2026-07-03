import styles from "./Ayuda.module.css";

const secciones = [
  {
    titulo: "Registro e ingreso",
    items: [
      "Entra al link del Prode.",
      "Si es tu primera vez, crea tu usuario con email, contrasena y nombre.",
      "Si ya tenes cuenta, inicia sesion con tu email y contrasena.",
    ],
    nota: "Usa un email real o uno que recuerdes, porque sera tu usuario para volver a entrar.",
  },
  {
    titulo: "Completar perfil",
    items: [
      "Desde el menu superior entra a Perfil.",
      "Podes cambiar tu nombre visible.",
      "Podes agregar una foto de perfil y guardar los cambios.",
    ],
    nota: "La foto aparece en la tabla, la navegacion y los pronosticos del grupo.",
  },
  {
    titulo: "Cargar pronosticos",
    items: [
      "Entra a Mi pronostico.",
      "Carga los goles que crees que hara cada equipo.",
      "Presiona Guardar.",
      "Podes cambiar el resultado mientras el partido siga abierto.",
    ],
    nota: "Los filtros te ayudan a ver todos los partidos, pendientes, guardados y cerrados.",
  },
  {
    titulo: "Cierre de pronosticos",
    items: [
      "Cada partido se cierra 1 hora antes de empezar.",
      "Despues del cierre ya no se puede editar ese pronostico.",
      "Los pronosticos del grupo empiezan a estar visibles cuando el partido cerro.",
    ],
    nota: "No esperes al ultimo momento para cargar todos los resultados.",
  },
  {
    titulo: "Pronosticos del grupo",
    items: [
      "Entra a Pronosticos del grupo.",
      "Vas a ver los pronosticos de los demas participantes para partidos ya cerrados.",
      "La pantalla muestra marcador, tendencia general, promedio de goles y puntos cuando hay resultado final.",
    ],
  },
  {
    titulo: "Tabla de posiciones",
    items: [
      "Entra a Tabla para ver el ranking general.",
      "La tabla muestra puesto, puntos totales, exactos y ganadores acertados.",
    ],
  },
];

const puntos = [
  { ronda: "Fase de grupos", exacto: "3 pts", ganador: "1 pt", nota: null },
  {
    ronda: "Dieciseisavos, octavos y cuartos",
    exacto: "5 pts",
    ganador: "2 pts",
    nota: "Empate exacto sin clasificado correcto: 3 pts",
  },
  {
    ronda: "Semifinales, final y tercer puesto",
    exacto: "8 pts",
    ganador: "3 pts",
    nota: "Empate exacto sin clasificado correcto: 3 pts",
  },
];

const problemas = [
  {
    pregunta: "No puedo editar un partido",
    respuesta: "Probablemente ya cerro la ventana de carga. Recorda que se cierra 1 hora antes del inicio.",
  },
  {
    pregunta: "No veo los pronosticos de los demas",
    respuesta: "Solo se muestran cuando el partido ya cerro.",
  },
  {
    pregunta: "No aparece mi foto",
    respuesta: "Entra a Perfil, elegi una imagen y presiona Guardar perfil.",
  },
  {
    pregunta: "Me equivoque al cargar un resultado",
    respuesta: "Podes corregirlo desde Mi pronostico mientras el partido siga abierto.",
  },
];

export default function Ayuda() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Ayuda</h2>
        <p className={styles.sub}>Manual rapido para usar el Prode y resolver dudas frecuentes.</p>
      </div>

      <section className={styles.grid} aria-label="Manual de usuario">
        {secciones.map((seccion) => (
          <article className={styles.card} key={seccion.titulo}>
            <h3>{seccion.titulo}</h3>
            <ol>
              {seccion.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            {seccion.nota && <p className={styles.nota}>{seccion.nota}</p>}
          </article>
        ))}
      </section>

      <section className={styles.panel} aria-label="Sistema de puntos">
        <h3>Sistema de puntos</h3>
        <div className={styles.puntosGrid}>
          {puntos.map((p) => (
            <div className={styles.puntosItem} key={p.ronda}>
              <strong>{p.ronda}</strong>
              <span>Resultado exacto: {p.exacto}</span>
              <span>Ganador o empate correcto: {p.ganador}</span>
              {p.nota && <span>{p.nota}</span>}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panel} aria-label="Ejemplos">
        <h3>Ejemplos</h3>
        <p>
          Si pronosticas Argentina 2 - 1 Francia y el resultado real es Argentina 2 - 1
          Francia, sumas resultado exacto.
        </p>
        <p>
          Si pronosticas Argentina 2 - 1 Francia y el resultado real es Argentina 1 - 0
          Francia, no acertaste el marcador exacto, pero si el ganador.
        </p>
        <p>
          En eliminatorias, si pronosticas un empate exacto pero no acertas el equipo
          clasificado, sumas 3 puntos.
        </p>
      </section>

      <section className={styles.panel} aria-label="Problemas frecuentes">
        <h3>Problemas frecuentes</h3>
        <div className={styles.faq}>
          {problemas.map((p) => (
            <details key={p.pregunta}>
              <summary>{p.pregunta}</summary>
              <p>{p.respuesta}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
