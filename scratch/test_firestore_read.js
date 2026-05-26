const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const keyPath = './serviceAccountKey.json';
let serviceAccount;
if (fs.existsSync(keyPath)) {
  serviceAccount = require(path.resolve(keyPath));
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  const listingId = 'OtdVPYBT5HwQucCwxWAF';
  console.log(`Fetching listing ${listingId} from Firestore...`);
  
  const docRef = db.collection('listings').doc(listingId);
  const docSnap = await docRef.get();
  
  console.log(`Exists: ${docSnap.exists}`);
  if (docSnap.exists) {
    console.log("Data:", JSON.stringify(docSnap.data(), null, 2));
  } else {
    console.log("Document does not exist!");
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
