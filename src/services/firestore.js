import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { clasificarAcierto } from "../scoring";
import { obtenerRonda } from "./apiFootball";

// Guardar o actualizar pronóstico de un usuario para un partido
// Si ambos local y visitante son "", elimina el pronóstico (como si nunca se hubiera cargado)
export async function guardarPronostico(userId, partidoId, local, visitante, ganadorEmpate = null) {
  const ref = doc(db, "pronosticos", `${userId}_${partidoId}`);
  
  // Si ambos están vacíos, eliminar el documento
  if (local === "" && visitante === "") {
    try {
      await deleteDoc(ref);
    } catch (error) {
      console.log("Documento no encontrado para eliminar", error);
    }
    return;
  }
  
  await setDoc(ref, {
    userId,
    partidoId,
    local: Number(local),
    visitante: Number(visitante),
    ganadorEmpate: ganadorEmpate || null,
    actualizadoEn: serverTimestamp(),
  });
}

// Obtener todos los pronósticos de un usuario
export async function obtenerPronosticosUsuario(userId) {
  const q = query(collection(db, "pronosticos"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// Limpiar pronósticos null de un usuario (data de versiones antiguas)
export async function limpiarPronosticosNull(userId) {
  const q = query(collection(db, "pronosticos"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const toDelete = snap.docs.filter(doc => {
    const data = doc.data();
    return data.local === null || data.visitante === null;
  });
  await Promise.all(toDelete.map(doc => deleteDoc(doc.ref)));
}

// Obtener todos los pronósticos de un partido (para la pantalla de comparación)
export async function obtenerPronosticosPartido(partidoId) {
  const q = query(collection(db, "pronosticos"), where("partidoId", "==", partidoId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// ─── RESULTADOS MANUALES ────────────────────────────────────────────────────

// Guardar resultado de un partido (solo admin)
export async function guardarResultado(partidoId, local, visitante, ganadorEmpate = null) {
  const ref = doc(db, "resultados", String(partidoId));
  await setDoc(ref, {
    partidoId,
    local: Number(local),
    visitante: Number(visitante),
    ganadorEmpate: ganadorEmpate || null,
    actualizadoEn: serverTimestamp(),
  });
}

// Eliminar resultado de un partido
export async function eliminarResultado(partidoId) {
  const ref = doc(db, "resultados", String(partidoId));
  await deleteDoc(ref);
}

// Obtener todos los resultados cargados como mapa { partidoId: { local, visitante } }
export async function obtenerResultadosFirestore() {
  const snap = await getDocs(collection(db, "resultados"));
  const map = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    map[data.partidoId] = {
      local: data.local,
      visitante: data.visitante,
      ganadorEmpate: data.ganadorEmpate || null,
    };
  });
  return map;
}

// ─── TABLA ──────────────────────────────────────────────────────────────────

// Calcular y devolver tabla de posiciones
// Guardar los equipos reales de un partido predefinido en el fixture
export async function guardarEquiposPartido(partidoId, local, visitante) {
  const ref = doc(db, "equiposPartidos", String(partidoId));
  await setDoc(ref, {
    partidoId,
    local: String(local).trim(),
    visitante: String(visitante).trim(),
    actualizadoEn: serverTimestamp(),
  });
}

// Eliminar la asignacion manual y volver al texto original del fixture
export async function eliminarEquiposPartido(partidoId) {
  const ref = doc(db, "equiposPartidos", String(partidoId));
  await deleteDoc(ref);
}

// Obtener equipos asignados como mapa { partidoId: { local, visitante } }
export async function obtenerEquiposPartidosFirestore() {
  const snap = await getDocs(collection(db, "equiposPartidos"));
  const map = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    map[data.partidoId] = { local: data.local, visitante: data.visitante };
  });
  return map;
}

export async function obtenerTabla(partidos) {
  const usuariosSnap = await getDocs(collection(db, "usuarios"));
  const pronosticosSnap = await getDocs(collection(db, "pronosticos"));

  const pronosticos = pronosticosSnap.docs.map((d) => d.data());

  const tabla = usuariosSnap.docs.map((docU) => {
    const u = { id: docU.id, ...docU.data() };
    let puntos = 0;
    let exactos = 0;
    let ganadores = 0;

    partidos.forEach((p) => {
      const fixtureId = p.fixture.id;
      const resultadoLocal = p.goals.home;
      const resultadoVisitante = p.goals.away;
      const ronda = obtenerRonda(p.league?.round);

      if (resultadoLocal === null || resultadoVisitante === null) return;

      const pron = pronosticos.find(
        (pr) => pr.userId === u.id && pr.partidoId === fixtureId
      );
      if (!pron) return;

      const acierto = clasificarAcierto(
        { local: pron.local, visitante: pron.visitante, ganadorEmpate: pron.ganadorEmpate || null },
        {
          local: resultadoLocal,
          visitante: resultadoVisitante,
          ganadorEmpate: p.ganadorEmpate || null,
        },
        ronda
      );
      const pts = acierto.puntos;
      puntos += pts;
      if (acierto.tipo === "Exacto") exactos++;
      else if (acierto.tipo === "Ganador") ganadores++;
    });

    return { ...u, puntos, exactos, ganadores };
  });

  return tabla.sort((a, b) => b.puntos - a.puntos);
}

// ─── ROLES ──────────────────────────────────────────────────────────────────

// Obtener rol del usuario actual
export async function obtenerRolUsuario(userId) {
  const docRef = doc(db, "usuarios", userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().rol || "participante";
  }
  return "participante";
}

// Verificar si el usuario es administrador
export async function esAdministrador(userId) {
  const rol = await obtenerRolUsuario(userId);
  return rol === "administrador";
}

// Asignar rol de administrador (solo para uso administrativo)
export async function asignarAdministrador(userId) {
  const docRef = doc(db, "usuarios", userId);
  try {
    await updateDoc(docRef, { rol: "administrador" });
    return true;
  } catch (error) {
    console.error("Error al asignar rol de administrador:", error);
    return false;
  }
}

// Revocar rol de administrador
export async function revocarAdministrador(userId) {
  const docRef = doc(db, "usuarios", userId);
  try {
    await updateDoc(docRef, { rol: "participante" });
    return true;
  } catch (error) {
    console.error("Error al revocar rol de administrador:", error);
    return false;
  }
}
