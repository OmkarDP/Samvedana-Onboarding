// firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAixB_H84GpLpCbuVFbTuzYjT6EZUUv4AQ",
  authDomain: "samvedanafoundation-1ae98.firebaseapp.com",
  projectId: "samvedanafoundation-1ae98",
  storageBucket: "samvedanafoundation-1ae98.appspot.com",
  messagingSenderId: "422436144524",
  appId: "1:422436144524:web:4c06f2bb456f2f9eca42a9",
  measurementId: "G-JR78RD0EM2",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
