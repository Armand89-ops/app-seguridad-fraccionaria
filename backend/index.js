const express = require('express');     
const { MongoClient, ObjectId } = require('mongodb');  
const cors = require('cors');             

const app = express();                    

// MIDDLEWARES ESENCIALES:
app.use(cors());                         
app.use(express.json());               

const uri = "mongodb://localhost:27017";   
const client = new MongoClient(uri);      

let db;                                  
let coleccionUsuarios;                           

async function conectarDB() {
  try {
    await client.connect();                
    console.log('Conectado a MongoDB exitosamente');
    
    db = client.db("DBSeguridadFraccionaria");     
    
    coleccionUsuarios = db.collection("DatosUsuarios");   
    
    console.log('Base de datos y colección configuradas');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1); // Termina la aplicación si no puede conectar
  }
}

conectarDB().then(() => {
  app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
    console.log('Base de datos conectada y lista');
  });
});                           

app.get('/', (req, res) => {
  res.send('API de AplicacionTareas funcionando');
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

app.post('/anadirUsuarios', async (req, res) => {
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

app.post('/eliminarUsuario', async (req, res) => {
  const { id } = req.body;
  try {
    const resultado = await coleccionUsuarios.deleteOne({ _id: new ObjectId(id) });
    console.log('Usuario eliminado:', resultado);
    res.status(200).json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ mensaje: 'Error eliminando usuario' });
  }
});