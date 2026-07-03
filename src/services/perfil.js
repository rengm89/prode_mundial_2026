import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function obtenerPerfil(userId) {
  const snap = await getDoc(doc(db, "usuarios", userId));
  return snap.exists() ? snap.data() : null;
}

export async function guardarPerfil({ user, nombre, photoURL }) {
  await updateProfile(user, { displayName: nombre });

  await setDoc(
    doc(db, "usuarios", user.uid),
    {
      nombre,
      email: user.email,
      photoURL,
      actualizadoEn: serverTimestamp(),
    },
    { merge: true }
  );

  return { nombre, photoURL };
}
