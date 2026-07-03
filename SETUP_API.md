# 🔧 Configuración para cargar resultados en tiempo real

## Problema
La aplicación necesita obtener los marcadores reales de los partidos para calcular puntos automáticamente cuando terminan los juegos.

## Solución Implementada
Se creó una **Cloud Function en Firebase** que actúa como proxy seguro para la API de fútbol, evitando problemas de CORS y manteniendo la clave API protegida en el servidor.

---

## 📋 Pasos para configurar

### 1️⃣ Obtener la API Key

1. Ve a [https://www.api-football.com/](https://www.api-football.com/)
2. Regístrate o inicia sesión (plan gratuito disponible)
3. Copia tu API Key desde el dashboard
4. Abre el archivo `.env` en la raíz del proyecto
5. Reemplaza `YOUR_API_KEY_HERE` con tu clave real

```env
VITE_API_FOOTBALL_KEY=tu_clave_aqui_sin_comillas
```

### 2️⃣ Instalar dependencias de Cloud Functions

```bash
cd functions
npm install
cd ..
```

### 3️⃣ Configurar variable de entorno en Firebase

La Cloud Function necesita acceso a la API key. Hay dos formas:

#### Opción A: Variables de entorno en Firebase Console (Recomendado)

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `prode-mundial-2026-3e643`
3. Ve a **Functions** → **Settings**
4. En la sección de variables de entorno, agrega:
   - **Key:** `VITE_API_FOOTBALL_KEY`
   - **Value:** Tu API key real

#### Opción B: Usar `.env.local` (Desarrollo local)

```bash
# En la carpeta functions/
echo "VITE_API_FOOTBALL_KEY=tu_clave_aqui" > .env.local
```

### 4️⃣ Desplegar en Firebase

#### Opción A: Desplegar todo (hosting + functions)
```bash
npm run deploy
```

#### Opción B: Desplegar solo functions (recomendado si ya tienes hosting activo)
```bash
npm run deploy:functions
```

---

## 🧪 Pruebas Locales

### Probar con Vite (desarrollo)
```bash
npm run dev
```
- En desarrollo, las peticiones usan el proxy de Vite
- El proxy redirige `/api-football` → `https://v3.football.api-sports.io`
- **Importante:** Asegúrate de que `.env` tiene tu API key real

### Emular Cloud Functions localmente
```bash
# Primero instala firebase-tools
npm install -g firebase-tools

# Luego
firebase emulators:start --only functions
```

### Ver logs de Firebase
```bash
npm run functions:logs
```

---

## 🎯 Cómo funciona

### En desarrollo (localhost:5173)
```
App → /api-football → Proxy Vite → API real → Resultados
```

### En producción (Firebase Hosting)
```
App → Cloud Function URL → API real → Resultados
```

La URL de la Cloud Function es:
```
https://us-central1-prode-mundial-2026-3e643.cloudfunctions.net/getFixture
```

---

## 📊 Cálculo automático de puntos

Una vez que los resultados estén disponibles:

1. **Cuando se cargan los partidos**, `obtenerTabla()` en Firestore compara:
   - Pronóstico del usuario vs. Marcador real
   - Valida si es resultado exacto (3-8 pts según ronda) o solo ganador (1-3 pts)

2. **Se actualiza automáticamente** cuando:
   - El usuario abre la tabla de posiciones
   - Accede a la pantalla de inicio
   - Hace refresh

---

## ⚠️ Solución de problemas

### "Error: API_KEY no configurada"
- Verifica que `.env` existe en la raíz del proyecto
- Comprueba que `VITE_API_FOOTBALL_KEY` tiene una clave válida (no `YOUR_API_KEY_HERE`)
- En desarrollo, reinicia el servidor Vite: `npm run dev`

### "No se pudieron obtener resultados en tiempo real"
- Verifica que la API key es válida
- Comprueba que tu plan en api-football.com permite acceso a la API
- Revisa los logs: `npm run functions:logs`
- El sistema usa fixture local como fallback, pero sin resultados reales

### En producción no funciona
- Asegurate de haber deployado las functions: `npm run deploy:functions`
- Comprueba en Firebase Console que las functions están activas
- Verifica que la API key está en las variables de entorno de Firebase
- Revisa los logs de la Cloud Function en Firebase Console

### "Error de CORS" en navegador
- En desarrollo: asegúrate de que Vite está corriendo (`npm run dev`)
- En producción: la Cloud Function maneja CORS automáticamente

### "Error 404" al llamar a Cloud Function
- Verifica que la región es `us-central1` (o la que usaste)
- Confirma que el Project ID es correcto: `prode-mundial-2026-3e643`
- Comprueba que las functions están deployadas correctamente

---

## 🚀 Flujo completo para usuarios

1. Usuario hace pronosticados antes de que cierre el partido (60 min antes)
2. El partido se juega
3. Los resultados se publican en la API
4. Usuario abre la app y se cargan automáticamente los puntos
5. La tabla de posiciones se actualiza con los nuevos puntos

---

## 📝 Notas técnicas

- La API free de api-football.com tiene límites de peticiones. Verifica tu plan
- Los resultados tardan unos segundos en estar disponibles después de que termina el partido
- Si la API falla, la app sigue funcionando con datos locales (sin puntos calculados)
- Las Cloud Functions tienen un timeout de 60 segundos por defecto
- Los resultados se cachean en el navegador durante algunos segundos para evitar peticiones innecesarias

---

## 🔐 Seguridad

- La API key **nunca** está expuesta en el cliente
- Está almacenada de forma segura en Firebase Console
- Las Cloud Functions son la única forma de acceder a la API
- Las peticiones están protegidas por CORS desde el navegador
