import styles from "./Avatar.module.css";

function iniciales(nombre) {
  if (!nombre) return "?";
  return nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({ nombre, photoURL, size = "md", color }) {
  const style = color ? { background: color } : undefined;

  return (
    <div className={`${styles.avatar} ${styles[size]}`} style={style}>
      {photoURL ? (
        <img src={photoURL} alt={nombre ? `Foto de ${nombre}` : "Foto de perfil"} />
      ) : (
        <span>{iniciales(nombre)}</span>
      )}
    </div>
  );
}
