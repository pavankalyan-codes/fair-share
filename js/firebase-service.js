import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import {
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';

const config = window.ZettlupFirebaseConfig;
const placeholderValues = Object.values(config || {}).filter(value => {
  return typeof value === 'string' && value.includes('YOUR_FIREBASE_');
});

function failFirebaseLoad(message) {
  const error = new Error(message);
  window.ZettlupFirebaseError = error;
  window.dispatchEvent(new CustomEvent('zettlup:firebase-error', { detail: error }));
  throw error;
}

if (!config || placeholderValues.length) {
  failFirebaseLoad('Firebase web config is missing. Replace placeholders in js/firebase-config.js.');
}

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

function currentUser() {
  return auth.currentUser;
}

function sessionRef() {
  const user = currentUser();
  if (!user) throw new Error('Sign in before accessing zettlup data.');
  return doc(db, 'users', user.uid, 'zettlup', 'session');
}

async function loadSession() {
  const snapshot = await getDoc(sessionRef());
  return snapshot.exists() ? snapshot.data() : null;
}

async function saveSession(state) {
  await setDoc(sessionRef(), {
    expenses: state.expenses || [],
    names: state.names || [],
    updatedAt: serverTimestamp(),
  });
}

async function clearSession() {
  await deleteDoc(sessionRef());
}

function getUserLabel(user) {
  if (!user) return '';
  return user.displayName || user.email || 'Signed in';
}

window.ZettlupFirebase = {
  clearSession,
  currentUser,
  getUserLabel,
  loadSession,
  onAuthStateChanged: callback => onAuthStateChanged(auth, callback),
  saveSession,
  signInWithGoogle: () => signInWithPopup(auth, provider),
  signOutUser: () => signOut(auth),
};

window.dispatchEvent(new Event('zettlup:firebase-ready'));
