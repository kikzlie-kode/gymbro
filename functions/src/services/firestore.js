const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

const usersCol = () => db.collection("users");
const userDoc = (userId) => usersCol().doc(userId);
const todosCol = (userId) => userDoc(userId).collection("todos");
const logsCol = (userId) => userDoc(userId).collection("logs");

module.exports = { admin, db, usersCol, userDoc, todosCol, logsCol };
