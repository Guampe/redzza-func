// Con admin(SDK) logramos el acceso a Database (Firebase)
// El paquete Admin ya viene instalado (Node)
const admin = require("firebase-admin");

// Aquí inicializamos nuestra admin aplication para poderla usar
// Gracias a la carpeta .firebaserc ya se conoce nuestro proyecto ("default": "redzza-d5c67")
admin.initializeApp();

const db = admin.firestore();

module.exports = { admin, db };
