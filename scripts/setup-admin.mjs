#!/usr/bin/env node

import admin from 'firebase-admin';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Buscar archivo JSON
const files = readdirSync('.');
const adminKey = files.find(f => f.includes('firebase-adminsdk'));

if (!adminKey) {
  console.error('❌ No se encontró archivo firebase-adminsdk-*.json');
  process.exit(1);
}

console.log(`📄 Encontrado: ${adminKey}`);

const serviceAccount = JSON.parse(readFileSync(adminKey, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const ADMIN_EMAILS = [
  'renzogiraudomiani@gmail.com',
  'xiromix57@hotmail.com',
];

async function main() {
  console.log('\n🔄 Asignando roles de administrador...\n');

  for (const email of ADMIN_EMAILS) {
    try {
      const snapshot = await db
        .collection('usuarios')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log(`❌ ${email} - No encontrado`);
        continue;
      }

      const doc = snapshot.docs[0];
      await db.collection('usuarios').doc(doc.id).update({
        rol: 'administrador',
      });

      console.log(`✅ ${email}`);
      console.log(`   UID: ${doc.id}`);
    } catch (err) {
      console.log(`❌ ${email} - Error: ${err.message}`);
    }
  }

  console.log('\n✨ Completado\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
