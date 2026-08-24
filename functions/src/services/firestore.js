const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

const usersCol = () => db.collection("users");
const userDoc = (userId) => usersCol().doc(userId);
const todosCol = (userId) => userDoc(userId).collection("todos");
const logsCol = (userId) => userDoc(userId).collection("logs");
const mealsCol = (userId) => userDoc(userId).collection("meals");
const profileDoc = (userId) => userDoc(userId).collection("meta").doc("profile");
const presetsCol = (userId) => userDoc(userId).collection("presets");

module.exports = { admin, db, usersCol, userDoc, todosCol, logsCol, mealsCol, profileDoc, presetsCol };
