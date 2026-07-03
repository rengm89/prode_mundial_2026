# Asignar Rol de Administrador

Este script asigna automáticamente el rol de administrador a usuarios específicos en Firestore.

## ⚙️ Configuración

### Paso 1: Descargar la clave de Firebase Admin SDK

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Configuración del proyecto** (⚙️ en la esquina superior)
4. Abre la pestaña **Cuentas de servicio**
5. Haz clic en **Generar nueva clave privada**
6. Se descargará un archivo JSON

### Paso 2: Guardar la clave en el proyecto

Coloca el archivo JSON descargado en la raíz del proyecto con el nombre:
```
firebase-admin-key.json
```

### Paso 3: Instalar dependencia

```bash
npm install firebase-admin
```

### Paso 4: Ejecutar el script

```bash
node scripts/asignar-admin.js
```

## 📋 Resultado esperado

```
🔄 Asignando rol de administrador...

✅ renzogiraudomiani@gmail.com
   UID: abc123def456...
   Rol asignado: administrador

✅ xiromix57@hotmail.com
   UID: xyz789uvw012...
   Rol asignado: administrador

✨ Proceso completado
```

## ⚠️ Importante

- **NO HAGAS COMMIT** del archivo `firebase-admin-key.json` (debe estar en `.gitignore`)
- Este archivo contiene credenciales sensibles
- Solo tú y los administradores deben tener acceso a este archivo

## 🔐 Seguridad

Si accidentalmente haces push de `firebase-admin-key.json`:

1. Ve a Firebase Console > Cuentas de servicio
2. Elimina la clave comprometida
3. Genera una clave nueva
4. Reemplaza el archivo local
