const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const keyPath = process.argv[2];
const confirm = process.argv[3] === '--confirm';

if (!keyPath || !confirm) {
  console.error("Usage: node scripts/reset-database.js <pfad-zu-service-account-key.json> --confirm");
  console.error("Example: node scripts/reset-database.js ./serviceAccountKey.json --confirm");
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`Error: File not found under path: ${keyPath}`);
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = require(path.resolve(keyPath));
} catch (e) {
  console.error("Error parsing service account key file:", e);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function resetAuth() {
  console.log("Deleting all Firebase Authentication users...");
  let count = 0;
  
  async function deleteBatch(nextPageToken) {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const uids = listUsersResult.users.map(user => user.uid);
    
    if (uids.length > 0) {
      await auth.deleteUsers(uids);
      count += uids.length;
      console.log(`Deleted batch of ${uids.length} users (Total deleted: ${count})`);
    }
    
    if (listUsersResult.pageToken) {
      await deleteBatch(listUsersResult.pageToken);
    }
  }
  
  await deleteBatch();
  console.log("Auth users deletion complete.");
}

async function resetFirestore() {
  console.log("Deleting all Firestore root collections...");
  const collections = await db.listCollections();
  
  for (const collection of collections) {
    console.log(`Deleting collection: "${collection.id}" recursively...`);
    await db.recursiveDelete(collection);
    console.log(`Successfully deleted collection: "${collection.id}"`);
  }
  console.log("Firestore deletion complete.");
}

async function resetStorage() {
  console.log("Deleting all files in default Storage bucket...");
  try {
    // Get the default bucket associated with the project
    const bucket = admin.storage().bucket(`${serviceAccount.project_id}.appspot.com`);
    const [files] = await bucket.getFiles();
    if (files.length > 0) {
      console.log(`Found ${files.length} files to delete...`);
      for (const file of files) {
        await file.delete();
        console.log(`Deleted file: ${file.name}`);
      }
    } else {
      console.log("No files found in storage bucket.");
    }
  } catch (err) {
    console.warn("Storage reset skipped/failed (bucket might not be initialized):", err.message);
  }
  console.log("Storage cleanup complete.");
}

async function main() {
  console.log(`----------------------------------------`);
  console.log(`⚠️ TARGET PROJECT ID: ${serviceAccount.project_id}`);
  console.log(`----------------------------------------`);
  
  await resetAuth();
  await resetFirestore();
  await resetStorage();
  
  console.log(`----------------------------------------`);
  console.log(`✅ Success: Reset finished successfully!`);
  console.log(`----------------------------------------`);
  process.exit(0);
}

main().catch(err => {
  console.error("Reset failed:", err);
  process.exit(1);
});
