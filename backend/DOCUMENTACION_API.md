# 📚 DOCUMENTACIÓN COMPLETA - API BACKEND APLICACIÓN DE TAREAS

## 🎯 ¿QUÉ ES ESTE ARCHIVO?

Este documento explica **CADA LÍNEA DE CÓDIGO** del backend para que cualquier persona pueda:
- ✅ Entender cómo funciona la aplicación
- ✅ Modificar y expandir funcionalidades
- ✅ Crear su propia versión
- ✅ Solucionar problemas
- ✅ Añadir nuevas características

---

## 🏗️ ARQUITECTURA GENERAL

```
📱 React Native App ←→ 🌐 API Backend ←→ 🗃️ MongoDB Database
```

**Flujo de datos:**
1. Usuario interactúa con la app móvil
2. App envía peticiones HTTP al backend
3. Backend procesa y consulta la base de datos
4. Backend devuelve respuesta a la app
5. App muestra los resultados al usuario

---

## 📋 ÍNDICE DE CONTENIDOS

1. [Dependencias y Configuración](#1-dependencias-y-configuración)
2. [Configuración del Servidor](#2-configuración-del-servidor)
3. [Conexión a Base de Datos](#3-conexión-a-base-de-datos)
4. [Endpoints de Autenticación](#4-endpoints-de-autenticación)
5. [Endpoints de Tareas](#5-endpoints-de-tareas)
6. [Estructura de Datos](#6-estructura-de-datos)
7. [Cómo Expandir la API](#7-cómo-expandir-la-api)
8. [Solución de Problemas](#8-solución-de-problemas)

---

## 1. DEPENDENCIAS Y CONFIGURACIÓN

### 📦 Paquetes Necesarios

```javascript
const express = require('express');        // Framework web para Node.js
const { MongoClient, ObjectId } = require('mongodb');  // Cliente y utilidades de MongoDB
const cors = require('cors');              // Middleware para permitir Cross-Origin Resource Sharing
```

**¿Para qué sirve cada uno?**

- **Express**: Crea el servidor web y maneja las rutas (endpoints)
- **MongoDB**: Se conecta y opera con la base de datos
- **CORS**: Permite que React Native (puerto diferente) se comunique con el backend

### 🔧 Instalación

```bash
npm install express mongodb cors
```

---

## 2. CONFIGURACIÓN DEL SERVIDOR

### 🚀 Creación del Servidor

```javascript
const app = express();                     // Crea la aplicación Express
app.use(cors());                          // Permite peticiones desde React Native
app.use(express.json());                  // Permite recibir y parsear JSON
```

**¿Por qué es importante?**

- **app.use(cors())**: Sin esto, React Native no puede comunicarse con el backend
- **app.use(express.json())**: Sin esto, no puedes recibir datos JSON en las peticiones

### 📡 Puerto y Arranque

```javascript
app.listen(3000, () => {
  console.log('Servidor corriendo en puerto 3000');
});
```

**IMPORTANTE**: El puerto 3000 debe coincidir en:
- ✅ Todas las URLs de React Native
- ✅ Tu configuración de red local

---

## 3. CONEXIÓN A BASE DE DATOS

### 🗃️ Configuración MongoDB

```javascript
const uri = "mongodb://localhost:27017";   // URL de conexión a MongoDB local
const client = new MongoClient(uri);       // Cliente para conectar con MongoDB

let db;                                    // Referencia a la base de datos
let coleccion;                            // Referencia a la colección de usuarios

async function conectarDB() {
  await client.connect();                  // Establece conexión con MongoDB
  db = client.db("AplicacionTareas");      // Selecciona/crea la base de datos
  coleccion = db.collection("Usuarios");   // Selecciona/crea la colección
}
conectarDB();
```

**¿Cómo modificar para usar MongoDB Atlas (en la nube)?**

```javascript
// Cambiar esta línea:
const uri = "mongodb://localhost:27017";

// Por esta (con tu string de conexión de Atlas):
const uri = "mongodb+srv://usuario:password@cluster.mongodb.net/AplicacionTareas";
```

---

## 4. ENDPOINTS DE AUTENTICACIÓN

### 🔐 LOGIN: POST /login

**¿Qué hace?** Verifica si un usuario existe y sus credenciales son correctas.

```javascript
app.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;             // Extrae datos del cuerpo
  const resultado = await coleccion.findOne({ 
    usuario, 
    contrasena
  });                                                   // Busca usuario con esas credenciales
  
  if (resultado) {                                      // Si encuentra el usuario
    res.json({ 
      success: true, 
      mensaje: 'Logeado correctamente', 
      id: resultado._id                                 // Devuelve el ID para futuras operaciones
    });
  } else {                                              // Si no encuentra el usuario
    res.json({ 
      success: false, 
      mensaje: 'Usuario o contraseña incorrectos' 
    });
  }
});
```

**Petición desde React Native:**
```javascript
const response = await fetch('http://192.168.0.112:3000/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ usuario: "miusuario", contrasena: 12345 }),
});
```

**🔧 Cómo mejorar la seguridad:**

```javascript
// 1. Hashear contraseñas con bcrypt
const bcrypt = require('bcrypt');

// En registro:
const hashedPassword = await bcrypt.hash(contrasena, 10);

// En login:
const isValid = await bcrypt.compare(contrasena, resultado.contrasena);
```

### 📝 REGISTRO: POST /registrar

**¿Qué hace?** Crea un nuevo usuario en la base de datos.

```javascript
app.post('/registrar', async (req, res) => {
  const { usuario, contrasena } = req.body;             // Extrae datos del nuevo usuario
  const resultado = await coleccion.insertOne({ 
    usuario, 
    contrasena 
  });                                                   // Inserta el nuevo usuario
  
  if (resultado.acknowledged) {                         // Si MongoDB confirma la inserción
    res.json({ 
      success: true, 
      mensaje: 'Usuario registrado correctamente' 
    });
  } else {                                              // Si hay error
    res.json({ 
      success: false, 
      mensaje: 'Error al registrar el usuario' 
    });
  }
});
```

**🔧 Cómo validar usuarios únicos:**

```javascript
app.post('/registrar', async (req, res) => {
  const { usuario, contrasena } = req.body;
  
  // Verificar si el usuario ya existe
  const usuarioExistente = await coleccion.findOne({ usuario });
  if (usuarioExistente) {
    return res.json({ 
      success: false, 
      mensaje: 'El usuario ya existe' 
    });
  }
  
  // Continuar con el registro...
});
```

---

## 5. ENDPOINTS DE TAREAS

### 📋 OBTENER TAREAS: GET /tareas

**¿Qué hace?** Recupera todas las tareas de un usuario específico.

```javascript
app.get('/tareas', async (req, res) => {
  const { id } = req.query;                             // Extrae ID del usuario de la URL
  const tareas = await db.collection('Tareas').find({ 
    idUsuario: new ObjectId(id)                         // Busca tareas de este usuario
  }).toArray();                                         // Convierte a array
  res.json(tareas);                                     // Devuelve las tareas
});
```

**URL de ejemplo:** `GET http://localhost:3000/tareas?id=60f7d2e9e8b8a12345678901`

**🔧 Cómo añadir filtros:**

```javascript
app.get('/tareas', async (req, res) => {
  const { id, estado, limite } = req.query;
  
  let filtro = { idUsuario: new ObjectId(id) };
  
  // Filtrar por estado si se proporciona
  if (estado && estado !== 'Todas') {
    filtro.Estado = estado;
  }
  
  let query = db.collection('Tareas').find(filtro);
  
  // Limitar resultados si se proporciona
  if (limite) {
    query = query.limit(parseInt(limite));
  }
  
  const tareas = await query.toArray();
  res.json(tareas);
});
```

### 📄 OBTENER UNA TAREA: GET /tarea

**¿Qué hace?** Recupera los detalles de una tarea específica (para edición).

```javascript
app.get('/tarea', async (req, res) => {
  const { id } = req.query;                             // Extrae ID de la tarea
  const tarea = await db.collection('Tareas').findOne({ 
    _id: new ObjectId(id)                               // Busca por ID único
  });
  
  if (tarea) {                                          // Si encuentra la tarea
    res.json(tarea);                                    // Devuelve los datos
  } else {                                              // Si no la encuentra
    res.status(404).json({ 
      mensaje: 'Tarea no encontrada' 
    });
  }
});
```

### ➕ CREAR TAREA: POST /AgregarTareas

**¿Qué hace?** Añade una nueva tarea a la base de datos.

```javascript
app.post('/AgregarTareas', async (req, res) => {
  const { idUsuario, TituloTarea, DescripTarea, Estado } = req.body;
  
  await db.collection('Tareas').insertOne({             // Inserta nueva tarea
    idUsuario: new ObjectId(idUsuario),                 // Relación con el usuario
    TituloTarea,                                        // Título (máx 20 chars)
    DescripTarea,                                       // Descripción (máx 100 chars)
    Estado                                              // "Pendiente" o "Completada"
  });
  
  res.json({ 
    success: true, 
    mensaje: 'Tarea agregada' 
  });
});
```

**🔧 Cómo añadir timestamp automático:**

```javascript
await db.collection('Tareas').insertOne({
  idUsuario: new ObjectId(idUsuario),
  TituloTarea,
  DescripTarea,
  Estado,
  fechaCreacion: new Date(),                            // Fecha actual
  fechaModificacion: new Date()
});
```

### ✏️ EDITAR TAREA: POST /editarTarea

**¿Qué hace?** Modifica una tarea existente.

```javascript
app.post('/editarTarea', async (req, res) => {
  const { id, TituloTarea, DescripTarea, Estado } = req.body;
  
  const resultado = await db.collection('Tareas').updateOne(
    { _id: new ObjectId(id) },                          // Encuentra la tarea
    { $set: { TituloTarea, DescripTarea, Estado } }     // Actualiza campos
  );
  
  if (resultado.modifiedCount === 1) {                  // Si se modificó
    res.json({ success: true, mensaje: 'Tarea editada' });
  } else {                                              // Si no se modificó
    res.json({ success: false, mensaje: 'No se pudo editar la tarea' });
  }
});
```

**🔧 Cómo añadir fecha de modificación:**

```javascript
const resultado = await db.collection('Tareas').updateOne(
  { _id: new ObjectId(id) },
  { 
    $set: { 
      TituloTarea, 
      DescripTarea, 
      Estado,
      fechaModificacion: new Date()                     // Actualizar timestamp
    } 
  }
);
```

### 🗑️ ELIMINAR TAREA: POST /eliminarTarea

**¿Qué hace?** Borra permanentemente una tarea.

```javascript
app.post('/eliminarTarea', async (req, res) => {
  const { id } = req.body;                              // ID de la tarea a eliminar
  
  const resultado = await db.collection('Tareas').deleteOne({ 
    _id: new ObjectId(id)                               // Elimina por ID
  });
  
  if (resultado.deletedCount === 1) {                   // Si se eliminó
    res.json({ success: true, mensaje: 'Tarea eliminada' });
  } else {                                              // Si no se eliminó
    res.json({ success: false, mensaje: 'No se pudo eliminar la tarea' });
  }
});
```

**🔧 Soft Delete (marcar como eliminada sin borrar):**

```javascript
// En lugar de deleteOne, usar updateOne:
const resultado = await db.collection('Tareas').updateOne(
  { _id: new ObjectId(id) },
  { 
    $set: { 
      eliminada: true,
      fechaEliminacion: new Date()
    } 
  }
);

// Y modificar las consultas para excluir eliminadas:
const tareas = await db.collection('Tareas').find({ 
  idUsuario: new ObjectId(id),
  eliminada: { $ne: true }                              // No eliminadas
}).toArray();
```

---

## 6. ESTRUCTURA DE DATOS

### 👤 Colección "Usuarios"

```javascript
{
  _id: ObjectId("60f7d2e9e8b8a12345678901"),           // ID único generado por MongoDB
  usuario: "miusuario",                                 // Nombre de usuario (string)
  contrasena: 12345                                     // Contraseña (number)
}
```

### 📋 Colección "Tareas"

```javascript
{
  _id: ObjectId("60f7d2e9e8b8a12345678902"),           // ID único de la tarea
  idUsuario: ObjectId("60f7d2e9e8b8a12345678901"),     // Referencia al usuario
  TituloTarea: "Completar proyecto",                    // Título (máx 20 caracteres)
  DescripTarea: "Terminar la aplicación de tareas...", // Descripción (máx 100 caracteres)
  Estado: "Pendiente"                                   // "Pendiente" o "Completada"
}
```

---

## 7. CÓMO EXPANDIR LA API

### 🏷️ Añadir Categorías a las Tareas

1. **Modificar estructura de datos:**
```javascript
{
  // ... campos existentes
  categoria: "Trabajo",                                 // Nueva campo
  prioridad: "Alta",                                    // Otro campo nuevo
  fechaLimite: new Date("2025-12-31")                  // Fecha límite
}
```

2. **Modificar endpoint de creación:**
```javascript
app.post('/AgregarTareas', async (req, res) => {
  const { idUsuario, TituloTarea, DescripTarea, Estado, categoria, prioridad } = req.body;
  
  await db.collection('Tareas').insertOne({
    idUsuario: new ObjectId(idUsuario),
    TituloTarea,
    DescripTarea,
    Estado,
    categoria: categoria || "General",                  // Valor por defecto
    prioridad: prioridad || "Media",                    // Valor por defecto
    fechaCreacion: new Date()
  });
  
  res.json({ success: true, mensaje: 'Tarea agregada' });
});
```

3. **Añadir filtros por categoría:**
```javascript
app.get('/tareas', async (req, res) => {
  const { id, estado, categoria } = req.query;
  
  let filtro = { idUsuario: new ObjectId(id) };
  
  if (estado && estado !== 'Todas') {
    filtro.Estado = estado;
  }
  
  if (categoria && categoria !== 'Todas') {
    filtro.categoria = categoria;
  }
  
  const tareas = await db.collection('Tareas').find(filtro).toArray();
  res.json(tareas);
});
```

### 🔍 Añadir Búsqueda de Tareas

```javascript
app.get('/buscar-tareas', async (req, res) => {
  const { id, termino } = req.query;
  
  const tareas = await db.collection('Tareas').find({
    idUsuario: new ObjectId(id),
    $or: [
      { TituloTarea: { $regex: termino, $options: 'i' } },      // Buscar en título
      { DescripTarea: { $regex: termino, $options: 'i' } }      // Buscar en descripción
    ]
  }).toArray();
  
  res.json(tareas);
});
```

### 📊 Añadir Estadísticas

```javascript
app.get('/estadisticas', async (req, res) => {
  const { id } = req.query;
  
  const total = await db.collection('Tareas').countDocuments({
    idUsuario: new ObjectId(id)
  });
  
  const pendientes = await db.collection('Tareas').countDocuments({
    idUsuario: new ObjectId(id),
    Estado: "Pendiente"
  });
  
  const completadas = await db.collection('Tareas').countDocuments({
    idUsuario: new ObjectId(id),
    Estado: "Completada"
  });
  
  res.json({
    total,
    pendientes,
    completadas,
    porcentajeCompletado: total > 0 ? (completadas / total * 100).toFixed(1) : 0
  });
});
```

---

## 8. SOLUCIÓN DE PROBLEMAS

### 🚨 Errores Comunes y Soluciones

#### "Cannot connect to MongoDB"

**Problema:** MongoDB no está ejecutándose
**Solución:**
```bash
# En Windows (desde CMD como administrador):
net start MongoDB

# En macOS/Linux:
sudo systemctl start mongod
```

#### "CORS Error" en React Native

**Problema:** Falta configuración CORS
**Solución:** Verificar que tienes `app.use(cors());` en el servidor

#### "Cannot read property 'find' of undefined"

**Problema:** La conexión a la base de datos no se estableció
**Solución:** Verificar que `conectarDB()` se ejecute correctamente

#### "Invalid ObjectId"

**Problema:** El ID enviado no es un ObjectId válido
**Solución:**
```javascript
// Validar ObjectId antes de usar:
const { ObjectId } = require('mongodb');

if (!ObjectId.isValid(id)) {
  return res.status(400).json({ mensaje: 'ID inválido' });
}
```

### 🔧 Comandos Útiles

#### Instalar dependencias:
```bash
npm install express mongodb cors
```

#### Ejecutar el servidor:
```bash
node index.js
```

#### Verificar que funciona:
```bash
# En el navegador:
http://localhost:3000

# Debería mostrar: "API de AplicacionTareas funcionando"
```

#### Ver logs de MongoDB:
```bash
# En otra terminal:
mongod --verbose
```

### 📱 Configuración de Red para React Native

#### Para emulador:
```javascript
// Usar localhost:
const URL = "http://localhost:3000";
```

#### Para dispositivo físico:
```javascript
// Usar IP local (encontrar con ipconfig o ifconfig):
const URL = "http://192.168.0.112:3000";
```

---

## 🚀 PRÓXIMOS PASOS

Con esta documentación ya puedes:

1. ✅ **Entender** cada línea del código backend
2. ✅ **Modificar** funcionalidades existentes  
3. ✅ **Añadir** nuevas características
4. ✅ **Solucionar** problemas comunes
5. ✅ **Expandir** la API según tus necesidades

### 🎯 Ideas para Expandir:

- 🔐 **Autenticación JWT** para mayor seguridad
- 📧 **Sistema de notificaciones** por email
- 📱 **Push notifications** para recordatorios
- 🌐 **Deploy en la nube** (Heroku, Railway, etc.)
- 📊 **Dashboard web** para administración
- 🔄 **Sincronización offline** con React Native
- 🏷️ **Sistema de etiquetas** y categorías avanzadas
- 👥 **Tareas compartidas** entre usuarios
- 📈 **Reportes y gráficas** de productividad

¡Ahora tienes todo lo necesario para crear tu propia aplicación personalizada! 🎉
