importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Your web app's Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyCOI05TrQUok65T6C_Tl0nDR2ZEmrVbm-8",
  authDomain: "styleup-barbershop.firebaseapp.com",
  projectId: "styleup-barbershop",
  storageBucket: "styleup-barbershop.firebasestorage.app",
  messagingSenderId: "949607637663",
  appId: "1:949607637663:web:ca8c9c20ddc025839038aa"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'https://i.imgur.com/QTjOcy7.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});