(function initFirebaseConfig(root) {
  root.FairShareFirebaseConfig = {
    apiKey: '__FIREBASE_API_KEY__',
    appId: '__FIREBASE_APP_ID__',
    authDomain: '__FIREBASE_AUTH_DOMAIN__',
    messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
    projectId: '__FIREBASE_PROJECT_ID__',
    storageBucket: '__FIREBASE_STORAGE_BUCKET__',
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
