import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyCMylbIaxo5N3nXzAyOAcxKQMqV8fNRmkQ",
  authDomain: "taxease-f3daf.firebaseapp.com",
  projectId: "taxease-f3daf",
  storageBucket: "taxease-f3daf.appspot.com",
  messagingSenderId: "1059345245334",
  appId: "1:1059345245334:web:7266aef2ae2fc929a18eb7",
  measurementId: "G-ZBXH4NQKM9",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

