// firebaseConfig.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbae_WFHcINiBBjEDEyhbDKcaU_Aj7TQw",
  authDomain: "emlakasistan-a76f1.firebaseapp.com",
  projectId: "emlakasistan-a76f1",
  storageBucket: "emlakasistan-a76f1.appspot.com",
  messagingSenderId: "652074794709",
  appId: "1:652074794709:web:82ba55444395a926b56c5c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage, ref, uploadBytes, getDownloadURL, deleteObject };

