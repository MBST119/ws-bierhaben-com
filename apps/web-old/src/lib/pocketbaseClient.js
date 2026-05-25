import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

// 1. Firebase Configs for Dev and Prod
const devConfig = {
  projectId: "bierhaben-com-dev",
  appId: "1:701862115545:web:baa7da71bb41e1777e26c8",
  storageBucket: "bierhaben-com-dev.firebasestorage.app",
  apiKey: "AIzaSyCAlVqBwsL01LYiJLDrHUEqzcPeKLgHw5Q",
  authDomain: "bierhaben-com-dev.firebaseapp.com",
  messagingSenderId: "701862115545"
};

const prodConfig = {
  projectId: "bierhaben-com-prod",
  appId: "1:33740397108:web:0a640cfa6ac05a2b328861",
  storageBucket: "bierhaben-com-prod.firebasestorage.app",
  apiKey: "AIzaSyDeheFTcMDqhCf95OSX624m-Usqr9Xdu_M",
  authDomain: "bierhaben-com-prod.firebaseapp.com",
  messagingSenderId: "33740397108"
};

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const firebaseConfig = hostname.includes('bierhaben-com-prod.web.app') || hostname.includes('bierhaben-prod') 
  ? prodConfig 
  : devConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Helper: Read initial auth state from localStorage to maintain synchronous behavior
const getInitialAuthModel = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('pb_auth_model');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing stored auth model:', e);
      }
    }
  }
  return null;
};

// Global in-memory cache for expanded records to prevent N+1 queries
const docCache = new Map();

// 2. Collection Wrapper that emulates PocketBase collections APIs
class FirebaseCollectionWrapper {
  constructor(name, parent) {
    this.name = name;
    this.parent = parent;
  }

  // Prepares the payload, uploads files to Storage if FormData, returns normal JS object
  async _prepareData(data) {
    let dataObj = {};
    let filesToUpload = [];

    if (data instanceof FormData) {
      const keys = Array.from(new Set(Array.from(data.keys())));
      for (let key of keys) {
        const values = data.getAll(key);
        if (values[0] instanceof File) {
          for (let file of values) {
            filesToUpload.push({ key, file });
          }
        } else {
          dataObj[key] = values.length > 1 ? values : values[0];
        }
      }
    } else {
      dataObj = { ...data };
    }

    // Upload files to Firebase Storage and get URLs
    for (let item of filesToUpload) {
      const fileRef = ref(storage, `${this.name}/${Date.now()}_${item.file.name}`);
      const uploadResult = await uploadBytes(fileRef, item.file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      if (item.key === 'avatar' || item.key === 'image') {
        dataObj[item.key] = downloadUrl;
      } else {
        if (!dataObj[item.key]) {
          dataObj[item.key] = [];
        } else if (!Array.isArray(dataObj[item.key])) {
          dataObj[item.key] = [dataObj[item.key]];
        }
        dataObj[item.key].push(downloadUrl);
      }
    }

    return dataObj;
  }

  async create(data) {
    // Special handling for user signup
    if (this.name === 'users') {
      const email = data.email;
      const password = data.password;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const profileData = {
        name: data.name || '',
        location: data.location || '',
        phone: data.phone || '',
        avatar: '',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', uid), profileData);
      
      const record = { id: uid, email, ...profileData };
      return record;
    }

    const dataObj = await this._prepareData(data);
    dataObj.created = new Date().toISOString();
    dataObj.updated = new Date().toISOString();

    const docRef = await addDoc(collection(db, this.name), dataObj);
    return { id: docRef.id, ...dataObj };
  }

  async update(id, data) {
    const dataObj = await this._prepareData(data);
    dataObj.updated = new Date().toISOString();

    const docRef = doc(db, this.name, id);
    await updateDoc(docRef, dataObj);

    if (this.name === 'users' && this.parent.authStore.model?.id === id) {
      const updatedModel = { ...this.parent.authStore.model, ...dataObj };
      this.parent.authStore.model = updatedModel;
      if (typeof window !== 'undefined') {
        localStorage.setItem('pb_auth_model', JSON.stringify(updatedModel));
      }
    }

    const updatedSnap = await getDoc(docRef);
    return { id, ...updatedSnap.data() };
  }

  async getOne(id, options = {}) {
    const docSnap = await getDoc(doc(db, this.name, id));
    if (!docSnap.exists()) {
      throw new Error(`Document with ID ${id} not found in collection ${this.name}`);
    }
    const record = { id, ...docSnap.data() };

    if (options.expand) {
      await this._expandRecord(record, options.expand);
    }
    return record;
  }

  async delete(id) {
    await deleteDoc(doc(db, this.name, id));
    return true;
  }

  async getList(page, perPage, options = {}) {
    let q = collection(db, this.name);
    const constraints = [];

    // Parse filters
    if (options.filter) {
      const categoryMatch = options.filter.match(/category\s*=\s*"([^"]+)"/);
      if (categoryMatch) {
        constraints.push(where('category', '==', categoryMatch[1]));
      }
    }

    // Specially optimize messages queries to prevent fetching all messages and to avoid complex index errors
    let isMessagesUserQuery = false;
    let myId = null;
    if (this.name === 'messages' && options.filter && (options.filter.includes('senderId') || options.filter.includes('recipientId'))) {
      const matches = [...options.filter.matchAll(/"([^"]+)"/g)].map(m => m[1]);
      if (matches.length > 0) {
        myId = matches[0];
        isMessagesUserQuery = true;
      }
    }

    // Apply sorting
    if (options.sort && !isMessagesUserQuery) {
      const isDesc = options.sort.startsWith('-');
      const field = isDesc ? options.sort.substring(1) : options.sort;
      constraints.push(orderBy(field, isDesc ? 'desc' : 'asc'));
    }

    let items = [];
    if (isMessagesUserQuery && myId) {
      // Use two separate queries instead of or() for Safari compatibility
      const senderSnapshot = await getDocs(query(q, where('senderId', '==', myId)));
      const recipientSnapshot = await getDocs(query(q, where('recipientId', '==', myId)));
      const seen = new Set();
      senderSnapshot.forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          items.push({ id: d.id, ...d.data() });
        }
      });
      recipientSnapshot.forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          items.push({ id: d.id, ...d.data() });
        }
      });
    } else {
      const querySnapshot = await getDocs(query(q, ...constraints));
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
    }

    // In-memory sorting for optimized queries
    if (isMessagesUserQuery && options.sort) {
      const isDesc = options.sort.startsWith('-');
      const field = isDesc ? options.sort.substring(1) : options.sort;
      items.sort((a, b) => {
        const valA = a[field] || '';
        const valB = b[field] || '';
        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }

    // In-memory filters (full text searches & complex disjunctions)
    if (options.filter) {
      const searchMatch = options.filter.match(/title\s*~\s*"([^"]+)"\s*\|\|\s*description\s*~\s*"([^"]+)"/);
      if (searchMatch) {
        const queryText = searchMatch[1].toLowerCase();
        items = items.filter(item => 
          (item.title && item.title.toLowerCase().includes(queryText)) || 
          (item.description && item.description.toLowerCase().includes(queryText))
        );
      }

      if (options.filter.includes('senderId') || options.filter.includes('recipientId')) {
        const isChatQuery = options.filter.includes('&&');
        const matches = [...options.filter.matchAll(/"([^"]+)"/g)].map(m => m[1]);
        
        if (isChatQuery) {
          if (matches.length >= 2) {
            const userA = matches[0];
            const userB = matches.find(id => id !== userA) || userA;
            items = items.filter(item => 
              (item.senderId === userA && item.recipientId === userB) ||
              (item.senderId === userB && item.recipientId === userA)
            );
          }
        } else {
          if (matches.length > 0) {
            const userId = matches[0];
            items = items.filter(item => 
              item.senderId === userId || item.recipientId === userId
            );
          }
        }
      }
    }

    const totalItems = items.length;
    const startIndex = (page - 1) * perPage;
    const paginatedItems = items.slice(startIndex, startIndex + perPage);

    if (options.expand) {
      for (let item of paginatedItems) {
        await this._expandRecord(item, options.expand);
      }
    }

    return {
      page,
      perPage,
      totalItems,
      totalPages: Math.ceil(totalItems / perPage),
      items: paginatedItems
    };
  }

  async getFullList(options = {}) {
    const res = await this.getList(1, 1000, options);
    return res.items;
  }

  async _expandRecord(record, expandStr) {
    record.expand = {};
    const expandFields = expandStr.split(',');
    const promises = [];
    
    for (let field of expandFields) {
      field = field.trim();
      let collectionName = null;
      let docId = null;

      if (field === 'category' && record.category) {
        collectionName = 'categories';
        docId = record.category;
      } else if (field === 'userId' && record.userId) {
        collectionName = 'users';
        docId = record.userId;
      } else if (field === 'senderId' && record.senderId) {
        collectionName = 'users';
        docId = record.senderId;
      } else if (field === 'recipientId' && record.recipientId) {
        collectionName = 'users';
        docId = record.recipientId;
      } else if (field === 'listingId' && record.listingId) {
        collectionName = 'listings';
        docId = record.listingId;
      }

      if (collectionName && docId) {
        const cacheKey = `${collectionName}_${docId}`;
        
        if (docCache.has(cacheKey)) {
          const cachedData = docCache.get(cacheKey);
          if (cachedData instanceof Promise) {
            promises.push(cachedData.then(data => {
              if (data) record.expand[field] = data;
            }));
          } else if (cachedData) {
            record.expand[field] = cachedData;
          }
        } else {
          // Fetch and cache the promise to deduplicate simultaneous requests
          const fetchPromise = getDoc(doc(db, collectionName, docId)).then(snap => {
            if (snap.exists()) {
              const data = { id: snap.id, ...snap.data() };
              docCache.set(cacheKey, data); // replace promise with resolved data
              return data;
            } else {
              docCache.set(cacheKey, null);
              return null;
            }
          }).catch(e => {
            console.error(`Error expanding ${field}:`, e);
            docCache.delete(cacheKey); // remove on error so we can retry later
            return null;
          });
          
          docCache.set(cacheKey, fetchPromise);
          promises.push(fetchPromise.then(data => {
            if (data) record.expand[field] = data;
          }));
        }
      }
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  // Mock PocketBase authentication method for users collection
  async authWithPassword(email, password, options = {}) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    let userModel = { id: user.uid, email: user.email };
    if (userDoc.exists()) {
      userModel = { ...userModel, ...userDoc.data() };
    }
    
    this.parent.authStore.isValid = true;
    this.parent.authStore.model = userModel;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pb_auth_model', JSON.stringify(userModel));
    }
    return { record: userModel };
  }
}

// 3. Main PocketBase emulation class
class FirebasePocketBaseWrapper {
  constructor() {
    const initialModel = getInitialAuthModel();
    this.authStore = {
      isValid: initialModel !== null,
      model: initialModel,
      clear: () => {
        signOut(auth);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pb_auth_model');
        }
        this.authStore.isValid = false;
        this.authStore.model = null;
      }
    };

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.authStore.isValid = true;
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const model = { id: user.uid, email: user.email, ...userDoc.data() };
            this.authStore.model = model;
            if (typeof window !== 'undefined') {
              localStorage.setItem('pb_auth_model', JSON.stringify(model));
            }
          }
        } catch (e) {
          console.error('Error fetching user profile in auth observer:', e);
        }
      } else {
        this.authStore.isValid = false;
        this.authStore.model = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pb_auth_model');
        }
      }
    });

    this.files = {
      getUrl: (record, filename) => filename
    };
  }

  collection(name) {
    return new FirebaseCollectionWrapper(name, this);
  }
}

const pb = new FirebasePocketBaseWrapper();

// 4. Auto-seed Categories in Firestore
const seedCategories = async () => {
  try {
    const catSnap = await getDocs(collection(db, 'categories'));
    if (catSnap.empty) {
      console.log('Seeding initial categories to Firestore...');
      const initialCategories = [
        { name: "Möbel", emoji: "🪑" },
        { name: "Elektronik", emoji: "📱" },
        { name: "Kleidung", emoji: "👕" },
        { name: "Fahrzeuge", emoji: "🚗" },
        { name: "Haushalt", emoji: "🏠" },
        { name: "Sport", emoji: "⚽" },
        { name: "Sonstiges", emoji: "📦" }
      ];
      for (let cat of initialCategories) {
        await addDoc(collection(db, 'categories'), cat);
      }
      console.log('Categories seeded successfully.');
    }
  } catch (e) {
    console.error('Error seeding categories:', e);
  }
};
// seedCategories(); // Disabled in production to prevent unnecessary reads

export default pb;
export { pb as pocketbaseClient };
