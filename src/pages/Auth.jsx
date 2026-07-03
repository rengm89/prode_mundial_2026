import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registrar, iniciarSesion, enviarRecuperacionContraseña } from "../services/auth";
import styles from "./Auth.module.css";

export default function Auth() {
  const [modo, setModo] = useState("login"); // "login" | "registro" | "recuperacion"
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setExito("");
    setCargando(true);
    try {
      if (modo === "registro") {
        await registrar(nombre, email, password);
        navigate("/pronosticos");
      } else if (modo === "login") {
        await iniciarSesion(email, password);
        navigate("/pronosticos");
      } else if (modo === "recuperacion") {
        await enviarRecuperacionContraseña(email);
        setExito("Email de recuperación enviado. Revisa tu bandeja de entrada.");
        setEmail("");
      }
    } catch (err) {
      setError(traducirError(err.code));
    } finally {
      setCargando(false);
    }
  }

  function traducirError(code) {
    const errores = {
      "auth/email-already-in-use": "Ese email ya está registrado.",
      "auth/invalid-email": "Email inválido.",
      "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
      "auth/user-not-found": "No existe una cuenta con ese email.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/invalid-credential": "Email o contraseña incorrectos.",
      "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
    };
    return errores[code] ?? "Ocurrió un error. Intentá de nuevo.";
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.trophy}>🏆</span>
          <h1 className={styles.title}>Prode Mundial 2026</h1>
          <p className={styles.subtitle}>Canadá · México · Estados Unidos</p>
        </div>

        {modo !== "recuperacion" && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${modo === "login" ? styles.tabActive : ""}`}
              onClick={() => { setModo("login"); setError(""); setExito(""); }}
            >
              Ingresar
            </button>
            <button
              className={`${styles.tab} ${modo === "registro" ? styles.tabActive : ""}`}
              onClick={() => { setModo("registro"); setError(""); setExito(""); }}
            >
              Registrarse
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {modo === "recuperacion" && (
            <div className={styles.recuperacionHeader}>
              <h2 style={{ marginBottom: "8px", fontSize: "18px" }}>Recuperar contraseña</h2>
              <p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
                Ingresa tu email y recibirás un enlace para crear una nueva contraseña
              </p>
            </div>
          )}

          {modo === "registro" && (
            <div className={styles.field}>
              <label className={styles.label}>Nombre</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="ejemplo@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {modo !== "recuperacion" && (
            <div className={styles.field}>
              <label className={styles.label}>Contraseña</label>
              <input
                className={styles.input}
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
          {exito && <p style={{ color: "#10b981", fontSize: "14px", marginBottom: "12px", textAlign: "center" }}>{exito}</p>}

          <button className={styles.btn} type="submit" disabled={cargando}>
            {cargando
              ? "Cargando..."
              : modo === "login"
              ? "Ingresar"
              : modo === "registro"
              ? "Crear cuenta"
              : "Enviar enlace"}
          </button>

          {modo === "login" && (
            <button
              type="button"
              onClick={() => { setModo("recuperacion"); setError(""); setExito(""); }}
              style={{
                marginTop: "12px",
                background: "none",
                border: "none",
                color: "#3b82f6",
                cursor: "pointer",
                fontSize: "14px",
                textDecoration: "underline",
                width: "100%",
                padding: "8px 0",
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {modo === "recuperacion" && (
            <button
              type="button"
              onClick={() => { setModo("login"); setError(""); setExito(""); setEmail(""); }}
              style={{
                marginTop: "12px",
                background: "none",
                border: "none",
                color: "#3b82f6",
                cursor: "pointer",
                fontSize: "14px",
                textDecoration: "underline",
                width: "100%",
                padding: "8px 0",
              }}
            >
              Volver al login
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
