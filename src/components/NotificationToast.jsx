import styles from "./NotificationToast.module.css";

export function NotificationToast({ partido, minutosRestantes, onDismiss }) {
  if (!partido || !minutosRestantes) return null;

  return (
    <div className={styles.toast} role="alert" aria-live="assertive">
      <div className={styles.content}>
        <span className={styles.icon}>⏰</span>
        <div className={styles.texto}>
          <div className={styles.titulo}>
            ¡Pronóstico se cierra en {minutosRestantes} minuto{minutosRestantes === 1 ? "" : "s"}!
          </div>
          <div className={styles.subtitulo}>
            {partido.teams.home.name} vs {partido.teams.away.name}
          </div>
        </div>
        <button
          className={styles.btnClose}
          onClick={onDismiss}
          aria-label="Descartar notificación"
        >
          ✕
        </button>
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progress}
          style={{
            animation: `progress ${minutosRestantes}m linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
