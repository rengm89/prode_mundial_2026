import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export async function registrar(nombre, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: nombre });
  // Guardar perfil en Firestore
  await setDoc(doc(db, "usuarios", cred.user.uid), {
    nombre,
    email,
    photoURL: "",
    creadoEn: serverTimestamp(),
    puntos: 0,
    rol: "participante",
  });
  return cred.user;
}

export async function iniciarSesion(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function cerrarSesion() {
  await signOut(auth);
}

export async function enviarRecuperacionContraseña(email) {
  await sendPasswordResetEmail(auth, email);
}
