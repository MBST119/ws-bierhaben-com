const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Usage: node scripts/promote-admin.js <email> [serviceAccountKeyPath]
const email = process.argv[2];
const keyPath = process.argv[3] || './serviceAccountKey.json';

if (!email) {
  console.error("Fehler: Bitte gib eine E-Mail-Adresse an.");
  console.error("Verwendung: node scripts/promote-admin.js <email> [pfad-zu-service-account-key.json]");
  process.exit(1);
}

let serviceAccount;
try {
  if (fs.existsSync(keyPath)) {
    serviceAccount = require(path.resolve(keyPath));
  } else {
    console.log("Hinweis: Keine Dienstkonto-Schlüsseldatei unter " + keyPath + " gefunden. Verwende Standard-Initialisierung.");
  }
} catch (e) {
  console.error("Fehler beim Laden der Schlüsseldatei:", e);
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error("Fehler: Firebase Admin SDK konnte nicht initialisiert werden. Bitte lade eine serviceAccountKey.json von der Firebase Console herunter und gib ihren Pfad an.");
    console.error("Beispiel: node scripts/promote-admin.js " + email + " ./config/serviceAccountKey.json");
    process.exit(1);
  }
}

const db = admin.firestore();

async function promote() {
  console.log(`Suche Benutzer mit der E-Mail: ${email}...`);
  
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', email).get();
  
  if (snapshot.empty) {
    console.error(`Fehler: Kein Benutzer mit der E-Mail-Adresse "${email}" in der Firestore-Datenbank gefunden.`);
    console.error("Der Benutzer muss sich zuerst mindestens einmal in der App angemeldet haben, damit ein Firestore-Eintrag existiert.");
    process.exit(1);
  }
  
  const docs = [];
  snapshot.forEach(doc => docs.push(doc));
  
  for (const doc of docs) {
    console.log(`Befördere Benutzer ${doc.id} (${doc.data().displayName || 'Unbekannt'}) zu Super-Admin...`);
    await usersRef.doc(doc.id).update({
      role: 'superAdmin'
    });
  }
  
  console.log("Erfolgreich! Die Rolle 'superAdmin' wurde erfolgreich zugewiesen.");
  process.exit(0);
}

promote().catch(err => {
  console.error("Fehler während der Ausführung:", err);
  process.exit(1);
});
