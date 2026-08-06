// Replace the config object below with your actual project keys from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCybNabsv6XFLw-UBQq5Qba2_-M15p-oZI",
  authDomain: "investing-game-97ba3.firebaseapp.com",
  databaseURL: "https://investing-game-97ba3-default-rtdb.firebaseio.com/",
  projectId: "investing-game-97ba3",
  storageBucket: "investing-game-97ba3.firebasestorage.app",
  messagingSenderId: "122122120231",
  appId: "1:122122120231:web:902f0eb5d4c43ab42ff202"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();