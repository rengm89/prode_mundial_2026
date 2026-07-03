import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cerrarSesion } from "../services/auth";
import { useAuth } from "../context/useAuth";
import { obtenerPerfil } from "../services/perfil";
import { esAdministrador } from "../services/firestore";
import Avatar from "./Avatar";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuth();
  const [perfil, setPerfil] = useState({ nombre: "", photoURL: "" });
  const [esAdmin, setEsAdmin] = useState(false);

  const links = [
    { to: "/inicio", label: "Inicio" },
    { to: "/pronosticos", label: "Mi pronóstico" },
    { to: "/grupo", label: "Pronósticos del grupo" },
    { to: "/tabla", label: "Tabla" },
    { to: "/perfil", label: "Perfil" },
    { to: "/ayuda", label: "Ayuda" },
  ];

  const adminLinks = [
    { to: "/resultados", label: "⚙️ Resultados" },
  ];

  async function handleLogout() {
    await cerrarSesion();
    navigate("/");
  }

  useEffect(() => {
    if (!user?.uid) return undefined;
    let activo = true;

    async function cargarPerfil() {
      const [data, admin] = await Promise.all([
        obtenerPerfil(user.uid),
        esAdministrador(user.uid),
      ]);
      if (!activo) return;
      setPerfil({
        nombre: data?.nombre ?? user.displayName ?? "",
        photoURL: data?.photoURL ?? "",
      });
      setEsAdmin(admin);
    }

    function handlePerfilActualizado(event) {
      setPerfil({
        nombre: event.detail?.nombre ?? user.displayName ?? "",
        photoURL: event.detail?.photoURL ?? "",
      });
    }

    cargarPerfil();
    window.addEventListener("perfilActualizado", handlePerfilActualizado);

    return () => {
      activo = false;
      window.removeEventListener("perfilActualizado", handlePerfilActualizado);
    };
  }, [user?.uid, user?.displayName]);

  const nombrePerfil = perfil.nombre || user?.displayName;
  const todosLosLinks = esAdmin ? [...links, ...adminLinks] : links;

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <div className={styles.logo}>🏆 Prode 2026</div>
        <div className={styles.links}>
          {todosLosLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`${styles.link} ${location.pathname === l.to ? styles.active : ""} ${l.to === "/resultados" ? styles.linkAdmin : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className={styles.user}>
          <Link className={styles.userLink} to="/perfil" title="Mi perfil">
            <Avatar nombre={nombrePerfil} photoURL={perfil.photoURL} size="sm" />
            <span className={styles.nombre}>{nombrePerfil}</span>
          </Link>
          <button className={styles.logout} onClick={handleLogout} title="Salir">
            ↩
          </button>
        </div>
      </div>
    </nav>
  );
}
