#!/usr/bin/env node

import { readFileSync, readdirSync } from 'fs';

// Buscar archivo JSON
const files = readdirSync('.');
const adminKeyFile = files.find(f => f.includes('firebase-adminsdk'));

if (!adminKeyFile) {
  console.error('❌ No se encontró archivo firebase-adminsdk-*.json');
  process.exit(1);
}

console.log(`📄 Encontrado: ${adminKeyFile}\n`);

const serviceAccount = JSON.parse(readFileSync(adminKeyFile, 'utf8'));
const projectId = serviceAccount.project_id;

// Emails a asignar
const ADMIN_EMAILS = [
  'renzogiraudomiani@gmail.com',
  'xiromix57@hotmail.com',
];

// Obtener token de acceso
async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createJWT(serviceAccount),
    }),
  });

  const data = await response.json();
  return data.access_token;
}

// Crear JWT
function createJWT(serviceAccount) {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(
    JSON.stringify({
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );

  const crypto = await import('crypto');
  const sign = crypto.createSign('sha256');
  sign.update(`${header}.${payload}`);
  const signature = sign
    .sign(serviceAccount.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${header}.${payload}.${signature}`;
}

async function main() {
  try {
    console.log('🔄 Obteniendo token de acceso...\n');
    const token = await getAccessToken();

    console.log('🔄 Buscando usuarios y asignando roles...\n');

    for (const email of ADMIN_EMAILS) {
      try {
        // Buscar documento
        const query = {
          structuredQuery: {
            from: [{ collectionId: 'usuarios' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'email' },
                op: 'EQUAL',
                value: { stringValue: email },
              },
            },
            limit: 1,
          },
        };

        const response = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(query),
          }
        );

        const results = await response.json();
        
        if (!results[0]?.document) {
          console.log(`❌ ${email} - No encontrado`);
          continue;
        }

        const docPath = results[0].document.name;
        const docId = docPath.split('/').pop();

        // Actualizar documento
        const updateResponse = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/usuarios/${docId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                rol: { stringValue: 'administrador' },
              },
            }),
          }
        );

        if (updateResponse.ok) {
          console.log(`✅ ${email}`);
          console.log(`   UID: ${docId}`);
        } else {
          console.log(`❌ ${email} - Error al actualizar`);
        }
      } catch (err) {
        console.log(`❌ ${email} - Error: ${err.message}`);
      }
    }

    console.log('\n✨ Completado\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
