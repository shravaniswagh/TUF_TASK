import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD5tJubiqReij4nPvliK-bhbX7fAmtOtuY",
  authDomain: "pin-board-aaeb9.firebaseapp.com",
  projectId: "pin-board-aaeb9",
  storageBucket: "pin-board-aaeb9.firebasestorage.app",
  messagingSenderId: "110326309231",
  appId: "1:110326309231:web:bc6f98835919c3fa05889a",
  measurementId: "G-6QXGLJRRQL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export const auth = getAuth(app);
