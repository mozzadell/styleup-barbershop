import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOI05TrQUok65T6C_Tl0nDR2ZEmrVbm-8",
  authDomain: "styleup-barbershop.firebaseapp.com",
  projectId: "styleup-barbershop",
  storageBucket: "styleup-barbershop.firebasestorage.app",
  messagingSenderId: "949607637663",
  appId: "1:949607637663:web:ca8c9c20ddc025839038aa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

// VAPID key for push notifications
export const VAPID_KEY = 'BCmN1_jUewMLuL93sz8kzc2WehmjctWimBzhb6x3hi1rRxImslaqFqC3HA0cCUNt0OQS5MwgtI3WuOZoavWt0Wk';