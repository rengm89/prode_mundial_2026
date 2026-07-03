import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Buscar archivo de credenciales
const cwd = process.cwd();
let credentialsFile = null;

try {
  const files = fs.readdirSync(cwd);
  credentialsFile = files.find(f => f.includes("firebase-adminsdk") && f.endsWith(".json"));
} catch (err) {
  console.error("Error leyendo directorio:", err.message);
  process.exit(1);
}

if (!credentialsFile) {
  console.error("❌ No se encontró archivo de credenciales firebase-adminsdk-*.json");
  process.exit(1);
}

const credentialsPath = path.join(cwd, credentialsFile);
console.log(`📄 Usando: ${credentialsFile}\n`);

let serviceAccount;
try {
  const content = fs.readFileSync(credentialsPath, "utf8");
  serviceAccount = JSON.parse(content);
} catch (err) {
  console.error("❌ Error al leer credenciales:", err.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Emails a los que asignar rol de administrador
const ADMIN_EMAILS = [
  "renzogiraudomiani@gmail.com",
  "xiromix57@hotmail.com",
];

async function asignarAdministradores() {
  console.log("🔄 Asignando rol de administrador...\n");

  for (const email of ADMIN_EMAILS) {
    try {
      // Buscar usuario por email en Firestore
      const snapshot = await db
        .collection("usuarios")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log(`❌ No se encontró usuario con email: ${email}`);
        continue;
      }

      const userDoc = snapshot.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Actualizar rol a administrador
      await db.collection("usuarios").doc(userId).update({
        rol: "administrador",
      });

      console.log(`✅ ${email}`);
      console.log(`   UID: ${userId}`);
      console.log(`   Rol asignado: administrador\n`);
    } catch (error) {
      console.log(`❌ Error con ${email}:`, error.message, "\n");
    }
  }

  console.log("✨ Proceso completado");
  process.exit(0);
}

// Ejecutar
asignarAdministradores().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});
