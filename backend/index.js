const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const url = require('url');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const https = require('https');
const { MongoClient, ObjectId } = require('mongodb');
const cron = require('node-cron');

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'; // base de datos local por defecto
const dbName = 'DBSeguridadFraccionaria';
const client = new MongoClient(uri);

let db;
let coleccionUsuarios;
let coleccionAnuncios;
let coleccionReglas;
let coleccionPagos;
let coleccionChats;
let coleccionTokens;
let coleccionMensajes;
let coleccionNotificacionesLog;

// Almacenamiento en memoria de tokens de recuperación (expiran en 30 min)
const tokensRecuperacion = {};

// Configuración de subida de imágenes (INE)
const IMAGES_DIR = path.join(__dirname, 'imagenesIne');
try {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
} catch (e) {
  console.warn('No se pudo crear el directorio de imágenes:', e?.message);
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
const upload = multer({ storage });

async function conectarDB() {
  try {
    await client.connect();
    db = client.db(dbName);
    coleccionUsuarios = db.collection('DatosUsuarios');
    coleccionAnuncios = db.collection('Anuncios');
    coleccionReglas = db.collection('ReglasUnidad');
    coleccionPagos = db.collection('Pagos');
    coleccionMensajes = db.collection('Mensajes');
    coleccionChats = db.collection('Chats');
    coleccionTokens = db.collection('Tokens');
    coleccionNotificacionesLog = db.collection('NotificacionesLog');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

conectarDB().then(() => {
  server.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
    console.log('Base de datos conectada y lista');
    // Iniciar scheduler diario a las 09:00 hora del servidor
    try {
      cron.schedule('0 9 * * *', async () => {
        const start = new Date();
        console.log(`[Cron] Ejecutando vigencias 3d @ ${start.toISOString()}`);
        try {
          const r = await enviarNotificacionesVigencia3Dias();
          console.log(`[Cron] Finalizado vigencias 3d (count=${r?.count ?? 'N/A'}) en ${(new Date().getTime()-start.getTime())}ms`);
        } catch (e) {
          console.warn('[Cron] Error en vigencias 3d:', e);
        }
      }, { timezone: 'America/Mexico_City' });
      console.log('Scheduler (cron) configurado: 09:00 America/Mexico_City todos los días');
    } catch (e) {
      console.warn('No se pudo iniciar el scheduler:', e?.message);
    }
  });
});

app.get('/', (req, res) => {
  res.send('API funcionando');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body; 
  try {
    const usuario = await coleccionUsuarios.findOne({ 
      email, 
      password
    });
    console.log('Usuario encontrado:', usuario);
    if (usuario) {
      res.json({
        success: true, 
        id: usuario._id, 
        tipoUsuario: usuario.TipoUsuario 
      });
    } else {
      res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ mensaje: 'Error en el login' });
  }
});

app.post('/agregarUsuarios', async (req, res) => {
  console.log('Datos recibidos en /añadirUsuarios:', req.body);
  const { NombreCompleto, Edificio, Departamento, Telefono, email, password, TipoUsuario, Ine } = req.body;
  try {
    const nuevoUsuario = {
      NombreCompleto,
      Edificio,
      Departamento,
      Telefono,
      email,
      password,
      TipoUsuario,
      Ine
    };
    const resultado = await coleccionUsuarios.insertOne(nuevoUsuario);
    console.log('Usuario añadido con ID:', resultado.insertedId);
    res.status(201).json({ _id: resultado.insertedId, ...nuevoUsuario });
  } catch (error) {
    console.error('Error añadiendo usuario:', error);
    res.status(500).json({ mensaje: 'Error añadiendo usuario' });
  }
});

app.post('/editarUsuario', async (req, res) => {
  const { id, NombreCompleto, Edificio, Departamento, Telefono, email, password, TipoUsuario, Ine } = req.body;
  try {
    const resultado = await coleccionUsuarios.updateOne(
      { _id: new ObjectId(id) },
      { $set: { NombreCompleto, Edificio, Departamento, Telefono, email, password, TipoUsuario, Ine } }
    );
    console.log('Usuario editado:', resultado);
    res.status(200).json({ mensaje: 'Usuario editado correctamente' });
  } catch (error) {
    console.error('Error editando usuario:', error);
    res.status(500).json({ mensaje: 'Error editando usuario' });
  }
});

app.get('/verUsuarios', async (req, res) => {
  try {
    const usuarios = await coleccionUsuarios.find({}).toArray();
    res.json(usuarios);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).send('Error obteniendo usuarios');
  }
}); 

app.get('/nombresUsuario', async (req, res) => {
  try {
    // Devuelve un array de objetos with _id y NombreCompleto
    const usuarios = await coleccionUsuarios.find({}, { projection: { _id: 1, NombreCompleto: 1 } }).toArray();
    // Renombra el campo para el frontend
    const resultado = usuarios.map(u => ({
      _id: u._id.toString(),
      nombre: u.NombreCompleto
    }));
    res.json(resultado);
  } catch (error) {
    console.error('Error obteniendo nombres de usuario:', error);
    res.status(500).send('Error obteniendo nombres de usuario');
  }
});

app.post('/eliminarUsuario', async (req, res) => {
  const { id } = req.body;
  try {
    // 1. Busca el usuario para obtener la URL de la imagen
    const usuario = await coleccionUsuarios.findOne({ _id: new ObjectId(id) });

    // 2. Elimina la imagen si existe
    if (usuario && usuario.Ine) {
      const parsedUrl = url.parse(usuario.Ine);
      const filename = path.basename(parsedUrl.pathname);
      const filePath = path.join(__dirname, 'imagenesIne', filename);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.warn('No se pudo eliminar la imagen:', err.message);
        } else {
          console.log('Imagen eliminada:', filePath);
        }
      });
    }

    // 3. Elimina el usuario de la base de datos
    await coleccionUsuarios.deleteOne({ _id: new ObjectId(id) });
    res.status(200).json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error eliminando usuario' });
  }
});
 
app.get('/verEdificios', async (req, res) => {
  try {
    const edificios = await coleccionUsuarios.distinct('Edificio');
    res.json(edificios);
  } catch (error) {
    console.error('Error obteniendo edificios:', error);
    res.status(500).send('Error obteniendo edificios');
  }
});


app.post('/subirIne', upload.single('imagen'), (req, res) => {
  // Construye la URL usando el host de la petición si está disponible
  const host = req.get('host') || '192.168.0.103:3000';
  const protocol = req.protocol || 'http';
  res.json({ url: `${protocol}://${host}/imagenesIne/${req.file.filename}` });
});

// Sirve la carpeta de imágenes
app.use('/imagenesIne', express.static(IMAGES_DIR));

// Servir assets estáticos del proyecto (para usar imágenes en plantillas HTML del backend)
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// ------------------------
// Utilidades Expo Push
// ------------------------

function chunkArray(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

function postExpo(messages) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(messages);
    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try {
          const json = JSON.parse(body || '{}');
          resolve(json);
        } catch (e) {
          resolve({ ok: false, error: 'invalid_json', raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendExpoToTokens(tokens = [], { title, body, data }) {
  if (!tokens.length) return { sent: 0, results: [] };
  const uniq = Array.from(new Set(tokens.filter(Boolean)));
  const batches = chunkArray(uniq, 100);
  const allResults = [];
  for (const batch of batches) {
    const messages = batch.map((to) => ({ to, sound: 'default', title, body, data }));
    try {
      const r = await postExpo(messages);
      allResults.push(r);
    } catch (e) {
      allResults.push({ ok: false, error: String(e) });
    }
  }
  return { sent: uniq.length, results: allResults };
}

// ------------------------
// Endpoints de Push Tokens y Envío
// ------------------------

app.post('/registrarPushToken', async (req, res) => {
  try {
    const { token, idUsuario, plataforma } = req.body || {};
    if (!token || typeof token !== 'string') return res.status(400).json({ mensaje: 'Falta token' });

    const now = new Date();
    const update = {
      token,
      plataforma: plataforma || 'desconocida',
      updatedAt: now,
    };
    if (idUsuario) update.idUsuario = new ObjectId(String(idUsuario));

    const r = await coleccionTokens.updateOne(
      { token },
      { $set: update, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    res.json({ ok: true, upsertedId: r.upsertedId || null });
  } catch (error) {
    console.error('Error registrando push token:', error);
    res.status(500).json({ mensaje: 'Error registrando token' });
  }
});

app.post('/enviarNotificacionExpo', async (req, res) => {
  try {
    const { title, body, data, plataforma, idsUsuarios, tokens } = req.body || {};
    if (!title || !body) return res.status(400).json({ mensaje: 'Faltan title/body' });

    let listaTokens = Array.isArray(tokens) ? tokens.filter(Boolean) : [];
    if (!listaTokens.length) {
      const filtro = {};
      if (plataforma) filtro.plataforma = plataforma;
      if (Array.isArray(idsUsuarios) && idsUsuarios.length) {
        filtro.idUsuario = { $in: idsUsuarios.map((id) => new ObjectId(String(id))) };
      }
      const docs = await coleccionTokens.find(filtro, { projection: { token: 1 } }).toArray();
      listaTokens = docs.map((d) => d.token).filter(Boolean);
    }

    const r = await sendExpoToTokens(listaTokens, { title, body, data });
    res.json({ ok: true, ...r });
  } catch (error) {
    console.error('Error enviando notificación:', error);
    res.status(500).json({ mensaje: 'Error enviando notificación' });
  }
});

// ------------------------
// Scheduler y utilidades de fecha
// ------------------------

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }


async function procesarVigenciasParaFecha(targetDate, { tipo = 'vigencia-3d', dias = 3 } = {}) {
  try {
    const inicio = startOfDay(targetDate);
    const fin = endOfDay(targetDate);

  console.log(`[Scheduler] Procesando vigencias para fecha objetivo: ${inicio.toDateString()} (ventana ${inicio.toISOString()} -> ${fin.toISOString()})`);

    const pagos = await coleccionPagos
      .find({ vigencia: { $gte: inicio, $lte: fin } })
      .project({ idUsuario: 1, nombreUsuario: 1, edificio: 1, departamento: 1, vigencia: 1 })
      .toArray();

    if (!pagos.length) {
      console.log(`[Scheduler] No hay pagos con vigencia en ventana: ${inicio.toISOString()} - ${fin.toISOString()}`);
      return { count: 0 };
    }

    let enviados = 0;
    for (const pago of pagos) {
      const idUsuario = pago.idUsuario;
      // Evitar duplicados por día y usuario
      const ya = await coleccionNotificacionesLog.findOne({
        tipo,
        idUsuario,
        fechaReferencia: inicio,
      });
      if (ya) continue;

      const tokensDocs = await coleccionTokens.find({ idUsuario: new ObjectId(String(idUsuario)) }).toArray();
      const tokens = tokensDocs.map((t) => t.token).filter(Boolean);
      if (!tokens.length) continue;

      const title = 'Pago próximo a vencer';
      const body = `Tu cuota vence en ${dias} días (vigencia: ${new Date(pago.vigencia).toLocaleDateString()}).`;
      const data = { tipo: 'vigencia', idUsuario: String(idUsuario), vigencia: pago.vigencia };
      await sendExpoToTokens(tokens, { title, body, data });

      await coleccionNotificacionesLog.insertOne({
        tipo,
        idUsuario,
        fechaReferencia: inicio,
        createdAt: new Date(),
      });
      enviados += tokens.length;
    }
    console.log(`[Scheduler] Notificaciones procesadas para ${inicio.toDateString()}: ${enviados}`);
    return { count: enviados };
  } catch (error) {
    console.error('[Scheduler] Error enviando notificaciones de vigencia:', error);
    return { error: String(error) };
  }
}

async function enviarNotificacionesVigencia3Dias() {
  const ahora = new Date();
  const target = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 3);
  console.log(`[Scheduler] Fecha objetivo para vigencia (3d): ${target.toDateString()} (${target.toISOString()})`);
  return procesarVigenciasParaFecha(target, { tipo: 'vigencia-3d', dias: 3 });
}

// Endpoint manual para probar el envío de notificaciones de vigencia (3 días)
app.post('/cron/test-vigencia-3d', async (_req, res) => {
  try {
    const r = await enviarNotificacionesVigencia3Dias();
    res.json({ ok: true, result: r });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Endpoint flexible para probar con días o fecha específica
app.post('/cron/test-vigencia', async (req, res) => {
  try {
    const { daysAhead, dateISO, tipo } = req.body || {};
    let target;
    if (typeof daysAhead === 'number') {
      const now = new Date();
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
    } else if (dateISO) {
      // Interpretar 'YYYY-MM-DD' como fecha local (no UTC)
      if (typeof dateISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        const [y, m, d] = dateISO.split('-').map(Number);
        target = new Date(y, m - 1, d);
      } else {
        target = new Date(dateISO);
      }
    } else {
      return res.status(400).json({ ok: false, error: 'Proporcione daysAhead o dateISO' });
    }
    console.log(`[Test] Procesando fecha objetivo: ${target.toDateString()} (${target.toISOString()})`);
    const r = await procesarVigenciasParaFecha(target, { tipo: tipo || 'vigencia-test', dias: typeof daysAhead === 'number' ? daysAhead : 'N/A' });
    res.json({ ok: true, result: r, target });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ------------------------
// Endpoints de depuración
// ------------------------

function parseLocalDateISO(s) {
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

// Lista pagos en la ventana del día indicado y cuántos tokens tiene cada usuario
app.get('/debug/vigencias', async (req, res) => {
  try {
    const { dateISO, daysAhead } = req.query || {};
    let target;
    if (daysAhead !== undefined) {
      const n = Number(daysAhead);
      if (isNaN(n)) return res.status(400).json({ ok: false, error: 'daysAhead inválido' });
      const now = new Date();
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
    } else if (dateISO) {
      target = parseLocalDateISO(String(dateISO));
    } else {
      return res.status(400).json({ ok: false, error: 'Proporcione dateISO o daysAhead' });
    }
    const inicio = startOfDay(target);
    const fin = endOfDay(target);
    const pagos = await coleccionPagos
      .find({ vigencia: { $gte: inicio, $lte: fin } })
      .project({ idUsuario: 1, nombreUsuario: 1, edificio: 1, departamento: 1, vigencia: 1 })
      .toArray();

    const detalles = [];
    for (const p of pagos) {
      const objId = new ObjectId(String(p.idUsuario));
      const tokens = await coleccionTokens.find({ idUsuario: objId }).project({ token: 1 }).toArray();
      detalles.push({ pago: p, tokensCount: tokens.length, tokens });
    }
    console.log(`[Debug] Vigencias en ventana ${inicio.toISOString()} -> ${fin.toISOString()}: ${pagos.length}`);
    res.json({ ok: true, inicio, fin, count: pagos.length, detalles });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Lista tokens por usuario
app.get('/debug/tokens', async (req, res) => {
  try {
    const { idUsuario } = req.query || {};
    if (!idUsuario) return res.status(400).json({ ok: false, error: 'idUsuario requerido' });
    const objId = new ObjectId(String(idUsuario));
    const tokens = await coleccionTokens.find({ idUsuario: objId }).toArray();
    res.json({ ok: true, count: tokens.length, tokens });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Migra pagos con vigencia en texto 'YYYY-MM-DD' a tipo Date local
app.post('/debug/migrar-vigencias', async (_req, res) => {
  try {
    const cursor = coleccionPagos.find({ vigencia: { $type: 'string' } });
    let actualizados = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const v = doc?.vigencia;
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [y, m, d] = v.split('-').map(Number);
        const fecha = new Date(y, m - 1, d);
        await coleccionPagos.updateOne({ _id: doc._id }, { $set: { vigencia: fecha } });
        actualizados++;
      }
    }
    res.json({ ok: true, actualizados });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});


app.post('/eliminarImagenIne', (req, res) => {
  const { url: urlImagen } = req.body;
  if (!urlImagen) return res.status(400).json({ mensaje: 'No se envió la URL' });

  const parsedUrl = url.parse(urlImagen);
  const filename = path.basename(parsedUrl.pathname);
  const filePath = path.join(__dirname, 'imagenesIne', filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.warn('No se pudo eliminar la imagen:', err.message);
      return res.status(500).json({ mensaje: 'No se pudo eliminar la imagen' });
    }
    res.json({ mensaje: 'Imagen eliminada correctamente' });
  });
});

// ------------------------
// Endpoints de Chats y Mensajes
// ------------------------

// Socket.IO: manejo de conexiones
io.on('connection', (socket) => {
  // Unir a un chat (sala)
  socket.on('join-chat', (idChat) => {
    if (idChat) socket.join(`chat:${idChat}`);
  });

  // Salir de un chat 
  socket.on('leave-chat', (idChat) => {
    if (idChat) socket.leave(`chat:${idChat}`);
  });

  // Enviar mensaje por socket
  socket.on('chat:enviar', async ({ idChat, contenido, idUsuario }, ack) => {
    try {
      if (!idChat || !contenido || !idUsuario) {
        ack && ack({ ok: false, error: 'Faltan campos' });
        return;
      }
      const doc = { idChat, contenido, idUsuario, fechaEnvio: new Date().toISOString() };
      const r = await coleccionMensajes.insertOne(doc);
      const saved = { _id: r.insertedId, ...doc };
      io.to(`chat:${idChat}`).emit('mensaje:nuevo', saved);
      ack && ack({ ok: true, mensaje: saved });
    } catch (error) {
      console.error('Socket enviar error:', error);
      ack && ack({ ok: false, error: 'Error interno' });
    }
  });
});

// Ver chats
app.get('/verChats', async (_req, res) => {
  try {
    const lista = await coleccionChats.find({}).sort({ fechaCreacion: -1 }).toArray();
    res.json(lista);
  } catch (error) {
    console.error('Error obteniendo chats:', error);
    res.status(500).send('Error obteniendo chats');
  }
});

// Crear chat
app.post('/crearChat', async (req, res) => {
  const { tipo, nombreEdificio, usuarios, idAdmin } = req.body || {};
  try {
    if (!tipo) return res.status(400).json({ mensaje: 'Falta tipo de chat' });
    const doc = {
      tipo,
      nombreEdificio: tipo === 'edificio' ? (nombreEdificio || '') : '',
      usuarios: Array.isArray(usuarios) ? usuarios : [],
      idAdmin: idAdmin || null,
      fechaCreacion: new Date().toISOString(),
    };
    const r = await coleccionChats.insertOne(doc);
    const saved = { _id: r.insertedId, ...doc };
    io.emit('chat:creado', saved);
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creando chat:', error);
    res.status(500).json({ mensaje: 'Error creando chat' });
  }
});

// Eliminar chat (y sus mensajes)
app.post('/eliminarChat', async (req, res) => {
  const { id } = req.body || {};
  try {
    if (!id) return res.status(400).json({ mensaje: 'Falta id' });
    const _id = new ObjectId(id);
  await coleccionMensajes.deleteMany({ idChat: id });
    const r = await coleccionChats.deleteOne({ _id });
    if (r.deletedCount === 0) return res.status(404).json({ mensaje: 'Chat no encontrado' });
  io.to(`chat:${id}`).emit('chat:eliminado', { idChat: id });
    res.json({ mensaje: 'Chat eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando chat:', error);
    res.status(500).json({ mensaje: 'Error eliminando chat' });
  }
});

// Ver mensajes por chat
app.get('/verMensajes/:idChat', async (req, res) => {
  const { idChat } = req.params;
  try {
    const lista = await coleccionMensajes.find({ idChat }).sort({ fechaEnvio: 1 }).toArray();
    res.json(lista);
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).send('Error obteniendo mensajes');
  }
});

// Agregar mensaje a chat
app.post('/agregarMensaje', async (req, res) => {
  const { idChat, contenido, idUsuario } = req.body || {};
  try {
    if (!idChat || !contenido || !idUsuario) return res.status(400).json({ mensaje: 'Faltan campos' });
    const doc = { idChat, contenido, idUsuario, fechaEnvio: new Date().toISOString() };
  const r = await coleccionMensajes.insertOne(doc);
  const saved = { _id: r.insertedId, ...doc };
  // Emitir a los clientes del chat
  io.to(`chat:${idChat}`).emit('mensaje:nuevo', saved);
  res.status(201).json(saved);
  } catch (error) {
    console.error('Error agregando mensaje:', error);
    res.status(500).json({ mensaje: 'Error agregando mensaje' });
  }
});
// ------------------------
// Endpoints de Reglas de Unidad
// ------------------------

// Ver reglas
app.get('/verReglas', async (_req, res) => {
  try {
    const lista = await coleccionReglas.find({}).sort({ _id: -1 }).toArray();
    res.json(lista);
  } catch (error) {
    console.error('Error obteniendo reglas:', error);
    res.status(500).send('Error obteniendo reglas');
  }
});

// Agregar regla
app.post('/agregarRegla', async (req, res) => {
  const { regla, idAdmin } = req.body || {};
  try {
    if (!regla) return res.status(400).json({ mensaje: 'Falta la regla' });
    const doc = { regla, idAdmin: idAdmin || null, fechaCreacion: new Date().toISOString() };
    const r = await coleccionReglas.insertOne(doc);
    res.status(201).json({ _id: r.insertedId, ...doc });
  } catch (error) {
    console.error('Error agregando regla:', error);
    res.status(500).json({ mensaje: 'Error agregando regla' });
  }
});

// Editar regla
app.post('/editarRegla', async (req, res) => {
  const { id, regla, idAdmin } = req.body || {};
  try {
    if (!id || !regla) return res.status(400).json({ mensaje: 'Faltan campos' });
    const _id = new ObjectId(id);
    const r = await coleccionReglas.updateOne({ _id }, { $set: { regla, idAdmin: idAdmin || null, fechaActualizacion: new Date().toISOString() } });
    if (r.matchedCount === 0) return res.status(404).json({ mensaje: 'Regla no encontrada' });
    res.json({ mensaje: 'Regla editada correctamente' });
  } catch (error) {
    console.error('Error editando regla:', error);
    res.status(500).json({ mensaje: 'Error editando regla' });
  }
});

// Eliminar regla
app.post('/eliminarRegla', async (req, res) => {
  const { id } = req.body || {};
  try {
    if (!id) return res.status(400).json({ mensaje: 'Falta id' });
    const _id = new ObjectId(id);
    const r = await coleccionReglas.deleteOne({ _id });
    if (r.deletedCount === 0) return res.status(404).json({ mensaje: 'Regla no encontrada' });
    res.json({ mensaje: 'Regla eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando regla:', error);
    res.status(500).json({ mensaje: 'Error eliminando regla' });
  }
});

// ------------------------
// Rutas de Pagos
// ------------------------


app.post('/agregarPago', async (req, res) => {
  const {
    edificio,
    departamento,
    idUsuario,
    nombreUsuario,
    tipoPago,
    metodoPago,
    monto,
    fechaPago,
    vigencia,
    estatus,
    procesadoPor,
    referenciaStripe
  } = req.body;

  try {
    const nuevoPago = {
      edificio,
      departamento,
      idUsuario: new ObjectId(idUsuario),
      nombreUsuario,
      tipoPago,
      metodoPago,
      monto,
      fechaPago: new Date(fechaPago),
      vigencia: new Date(vigencia),
      estatus,
      procesadoPor,
      referenciaStripe
    };
  const resultado = await coleccionPagos.insertOne(nuevoPago);
    res.status(201).json({ _id: resultado.insertedId, ...nuevoPago });
  } catch (error) {
    console.error('Error agregando pago:', error);
    res.status(500).json({ mensaje: 'Error agregando pago' });
  }
});

app.get('/verPagos', async (req, res) => {
  try {
    const pagos = await coleccionPagos.find({}).toArray();
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error obteniendo pagos' });
  }
});

app.get('/verPagosResidente/:idResidente', async (req, res) => {
  const { idResidente } = req.params;
  try {
    const pagos = await coleccionPagos.find({ idUsuario: new ObjectId(idResidente) }).toArray();
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error obteniendo pagos del residente' });
  }
});


// ------------------------
// Rutas de Anuncios
// ------------------------

// Obtener todos los anuncios
app.get('/verAnuncios', async (req, res) => {
  try {
    const anuncios = await coleccionAnuncios.find({}).toArray();
    res.json(anuncios);
  } catch (error) {
    console.error('Error obteniendo anuncios:', error);
    res.status(500).send('Error obteniendo anuncios');
  }
}); 

// Agregar anuncio
app.post('/agregarAnuncio', async (req, res) => {
  const { titulo, contenido, tipo, nombreEdificio, fechaEnvio, programado, fechaProgramada, idAdmin } = req.body || {};
  try {
    if (!titulo || !contenido || !tipo) return res.status(400).json({ mensaje: 'Faltan campos requeridos' });
    if (tipo === 'Edificio' && !nombreEdificio) return res.status(400).json({ mensaje: 'Falta nombre del edificio' });

    const doc = {
      titulo,
      contenido,
      tipo,
      nombreEdificio: tipo === 'Edificio' ? nombreEdificio : '',
      fechaEnvio: fechaEnvio || null,
      programado: !!programado,
  fechaProgramada: programado ? (fechaProgramada || null) : null,
      idAdmin: idAdmin || null,
    };
    const r = await coleccionAnuncios.insertOne(doc);
    res.status(201).json({ _id: r.insertedId, ...doc });
  } catch (error) {
    console.error('Error agregando anuncio:', error);
    res.status(500).json({ mensaje: 'Error agregando anuncio' });
  }
});

// Editar anuncio
app.post('/editarAnuncio', async (req, res) => {
  const { id, titulo, contenido, tipo, nombreEdificio, fechaEnvio, programado, fechaProgramada, idAdmin } = req.body || {};
  try {
    if (!id) return res.status(400).json({ mensaje: 'Falta id' });
    if (!titulo || !contenido || !tipo) return res.status(400).json({ mensaje: 'Faltan campos requeridos' });
    const _id = new ObjectId(id);

    const update = {
      titulo,
      contenido,
      tipo,
      nombreEdificio: tipo === 'Edificio' ? (nombreEdificio || '') : '',
      fechaEnvio: fechaEnvio || null,
      programado: !!programado,
      fechaProgramada: programado ? (fechaProgramada || null) : null,
      idAdmin: idAdmin || null,
    };

    const r = await coleccionAnuncios.updateOne({ _id }, { $set: update });
    if (r.matchedCount === 0) return res.status(404).json({ mensaje: 'Anuncio no encontrado' });
    res.json({ mensaje: 'Anuncio editado correctamente' });
  } catch (error) {
    console.error('Error editando anuncio:', error);
    res.status(500).json({ mensaje: 'Error editando anuncio' });
  }
});

// Eliminar anuncio
app.post('/eliminarAnuncio', async (req, res) => {
  const { id } = req.body || {};
  try {
    if (!id) return res.status(400).json({ mensaje: 'Falta id' });
    const _id = new ObjectId(id);
    const r = await coleccionAnuncios.deleteOne({ _id });
    if (r.deletedCount === 0) return res.status(404).json({ mensaje: 'Anuncio no encontrado' });
    res.json({ mensaje: 'Anuncio eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando anuncio:', error);
    res.status(500).json({ mensaje: 'Error eliminando anuncio' });
  }
});

//Ruta pra recuperar contraseña

app.post('/recuperarContrasena', async (req, res) => {
  const { email } = req.body;
  try {
    const usuario = await coleccionUsuarios.findOne({ email });
    if (!usuario) {
      return res.status(200).json({ mensaje: 'Si el correo existe, recibirás instrucciones.' });
    }
    // Genera token
    const token = crypto.randomBytes(32).toString('hex');
    tokensRecuperacion[token] = { id: usuario._id, expira: Date.now() + 1000 * 60 * 30 }; // 30 min
    // Envía email con enlace
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: '', //correo electrónico desde el que se envía
        pass: '' //contraseña de la aplicación generada en Google
      }
    });

  const proto = (req.headers['x-forwarded-proto'] || 'http');
  const host = req.headers.host || '192.168.0.103:3000';
  const link = `${proto}://${host}/restablecerContrasena?token=${token}`;
    await transporter.sendMail({
      from: 'armand89231@gmail.com',
      to: email,
      subject: 'Recupera tu contraseña',
      text: `Haz clic en este enlace para restablecer tu contraseña: ${link}`
    });

    res.status(200).json({ mensaje: 'Si el correo existe, recibirás instrucciones.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error recuperando contraseña' });
  }
});

// Página web para restablecer contraseña (GET)
app.get('/restablecerContrasena', (req, res) => {
  const { token } = req.query;
  // Muestra un formulario HTML simple
  res.send(`
    <html>
      <head>
        <title>Restablecer contraseña</title>
        <style>
          body { font-family: Arial; background: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; }
          form { background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px #ccc; }
          input, button { margin: 8px 0; padding: 8px; width: 100%; }
        </style>
      </head>
      <body>
        <form method="POST" action="/restablecerContrasena">
          <img src="/assets/images/iconofraccionamiento.png" alt="Logo" style="display:block; margin:0 auto 20px; max-width:100px;" />
          <h2>Restablecer contraseña</h2>
          <input type="hidden" name="token" value="${token}" />
          <input type="password" name="nuevaContrasena" placeholder="Nueva contraseña" required />
          <button type="submit">Cambiar contraseña</button>
        </form>
      </body>
    </html>
  `);
});

// Procesa el formulario de restablecimiento (POST desde HTML)
app.use(express.urlencoded({ extended: true })); // Para leer datos de formularios HTML

app.post('/restablecerContrasena', async (req, res) => {
  const { token, nuevaContrasena } = req.body;
  const datos = tokensRecuperacion[token];
  if (!datos || datos.expira < Date.now()) {
    return res.send(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Enlace inválido o expirado</title>
          <style>
            body { margin:0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #f6f8fb; display:flex; align-items:center; justify-content:center; min-height:100vh; color:#0f172a; }
            .card { width: 100%; max-width: 440px; background:#fff; border-radius:14px; box-shadow: 0 10px 30px rgba(2,6,23,0.08); padding: 32px 28px; text-align:center; }
            .logo { width: 84px; height:auto; display:block; margin: 0 auto 14px; }
            h1 { font-size: 22px; margin: 8px 0 6px; }
            p { margin: 0 0 14px; line-height:1.5; color:#475569; }
            .btn { display:inline-block; padding: 10px 16px; border-radius:10px; background:#0ea5e9; color:#fff; text-decoration:none; font-weight:600; }
            .btn:hover { background:#0284c7; }
          </style>
        </head>
        <body>
          <main class="card" role="main">
            <img class="logo" src="/assets/images/iconofraccionamiento.png" alt="Logo" />
            <h1>Enlace inválido o expirado</h1>
            <p>El vínculo para restablecer tu contraseña ya no es válido. Solicita uno nuevo desde la opción “Olvidé mi contraseña”.</p>
            <a class="btn" href="/">Ir al inicio</a>
          </main>
        </body>
      </html>
    `);
  }
  try {
    await coleccionUsuarios.updateOne(
      { _id: new ObjectId(datos.id) },
      { $set: { password: nuevaContrasena } }
    );
    delete tokensRecuperacion[token];
    res.send(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Contraseña actualizada</title>
          <style>
            body { margin:0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #f6f8fb; display:flex; align-items:center; justify-content:center; min-height:100vh; color:#0f172a; }
            .card { width: 100%; max-width: 480px; background:#fff; border-radius:14px; box-shadow: 0 10px 30px rgba(2,6,23,0.08); padding: 32px 28px; text-align:center; }
            .logo { width: 84px; height:auto; display:block; margin: 0 auto 14px; }
            .check { width:56px; height:56px; border-radius:50%; background:#10b981; display:flex; align-items:center; justify-content:center; margin: 10px auto 14px; }
            .check svg { width:28px; height:28px; color:#fff; }
            h1 { font-size: 22px; margin: 8px 0 6px; }
            p { margin: 0 0 18px; line-height:1.6; color:#475569; }
            .btn { display:inline-block; padding: 10px 16px; border-radius:10px; background:#0ea5e9; color:#fff; text-decoration:none; font-weight:600; }
            .btn:hover { background:#0284c7; }
          </style>
        </head>
        <body>
          <main class="card" role="main">
            <img class="logo" src="/assets/images/iconofraccionamiento.png" alt="Logo" />
            <div class="check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h1>Contraseña actualizada</h1>
            <p>Tu contraseña se cambió correctamente. Ya puedes cerrar esta ventana e iniciar sesión en la app.</p>
            <a class="btn" href="/">Ir al inicio</a>
          </main>
        </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Error</title>
          <style>
            body { margin:0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #fef2f2; display:flex; align-items:center; justify-content:center; min-height:100vh; color:#7f1d1d; }
            .card { width: 100%; max-width: 480px; background:#fff; border-radius:14px; box-shadow: 0 10px 30px rgba(127,29,29,0.12); padding: 28px 24px; text-align:center; border: 1px solid #fecaca; }
            .logo { width: 84px; height:auto; display:block; margin: 0 auto 10px; }
            h1 { font-size: 20px; margin: 6px 0 6px; }
            p { margin: 0 0 16px; line-height:1.6; color:#7f1d1d; }
            a { color:#991b1b; text-decoration:underline; }
          </style>
        </head>
        <body>
          <main class="card" role="main">
            <img class="logo" src="/assets/images/iconofraccionamiento.png" alt="Logo" />
            <h1>No se pudo actualizar la contraseña</h1>
            <p>Ocurrió un problema al guardar los cambios. Inténtalo de nuevo más tarde.</p>
            <a href="/">Volver al inicio</a>
          </main>
        </body>
      </html>
    `);
  }
});