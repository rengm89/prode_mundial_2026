import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import Avatar from "../components/Avatar";
import { guardarPerfil, obtenerPerfil } from "../services/perfil";
import styles from "./Perfil.module.css";

const MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_SIZE = 320;

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };

    img.src = url;
  });
}

async function comprimirAvatar(file) {
  const img = await cargarImagen(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const lado = Math.min(img.width, img.height);
  const sx = (img.width - lado) / 2;
  const sy = (img.height - lado) / 2;

  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  ctx.drawImage(img, sx, sy, lado, lado, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function Perfil() {
  const user = useAuth();
  const [nombre, setNombre] = useState(user?.displayName ?? "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL ?? "");
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function cargar() {
      if (!user?.uid) return;
      const perfil = await obtenerPerfil(user.uid);
      setNombre(perfil?.nombre ?? user.displayName ?? "");
      setPhotoURL(perfil?.photoURL ?? user.photoURL ?? "");
    }

    cargar();
  }, [user]);

  const preview = useMemo(() => {
    if (!archivo) return photoURL;
    return URL.createObjectURL(archivo);
  }, [archivo, photoURL]);

  useEffect(() => {
    return () => {
      if (archivo && preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [archivo, preview]);

  function handleArchivo(e) {
    const file = e.target.files?.[0];
    setError("");
    setOk("");

    if (!file) {
      setArchivo(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Elegí una imagen válida.");
      setArchivo(null);
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("La imagen debe pesar menos de 2 MB.");
      setArchivo(null);
      return;
    }

    setArchivo(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setError("El nombre no puede quedar vacío.");
      return;
    }

    setGuardando(true);
    try {
      const photoURLFinal = archivo ? await comprimirAvatar(archivo) : photoURL;
      const perfil = await guardarPerfil({
        user,
        nombre: nombreLimpio,
        photoURL: photoURLFinal,
      });
      setNombre(perfil.nombre);
      setPhotoURL(perfil.photoURL);
      setArchivo(null);
      setOk("Perfil actualizado.");
      window.dispatchEvent(new CustomEvent("perfilActualizado", { detail: perfil }));
    } catch {
      setError("No se pudo guardar el perfil.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Mi perfil</h2>
        <p className={styles.sub}>Tu foto aparece en la tabla, el grupo y la navegación.</p>
      </div>

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.avatarWrap}>
          <Avatar nombre={nombre} photoURL={preview} size="lg" />
        </div>

        <div className={styles.field}>
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={40}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="foto">Foto</label>
          <input id="foto" type="file" accept="image/*" onChange={handleArchivo} />
          <span className={styles.help}>JPG, PNG o WebP. Máximo 2 MB.</span>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {ok && <p className={styles.ok}>{ok}</p>}

        <button className={styles.btn} type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar perfil"}
        </button>
      </form>
    </div>
  );
}
