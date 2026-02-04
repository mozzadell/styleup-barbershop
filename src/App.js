import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Settings, LogOut, Upload, X, Check, Edit2, Scissors, Bell } from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration - YOUR ACTUAL CONFIG
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
const db = getFirestore(app);
const messaging = getMessaging(app);

// VAPID key for push notifications
const VAPID_KEY = 'BCmN1_jUewMLuL93sz8kzc2WehmjctWimBzhb6x3hi1rRxImslaqFqC3HA0cCUNt0OQS5MwgtI3WuOZoavWt0Wk';

// Simple hash for login
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64);
};

// Credentials
const credentials = {
  usernameHash: '0000000000000000000000000000000000000000000000000000000025de2f07',
  passwordHash: '000000000000000000000000000000000000000000000000000000001ce42809'
};

// Helper functions for Firebase
const FirebaseHelpers = {
  // Get profile from Firestore
  getProfile: async () => {
    try {
      const profileRef = doc(db, 'profile', 'barber');
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        return profileSnap.data();
      } else {
        // Default profile if doesn't exist
        const defaultProfile = {
          name: 'Marcus Johnson',
          specialty: 'Master Barber',
          bio: 'Specializing in classic cuts and modern styles. 15 years of experience.',
          location: 'Downtown Barbershop',
          phone: '(555) 123-4567',
          profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
          gallery: [
            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=600&h=600&fit=crop'
          ]
        };
        // Save default profile
        await setDoc(profileRef, defaultProfile);
        return defaultProfile;
      }
    } catch (error) {
      console.error('Error getting profile:', error);
      // Fallback to localStorage
      const profile = localStorage.getItem('barberProfile');
      return profile ? JSON.parse(profile) : null;
    }
  },

  setProfile: async (profile) => {
    try {
      const profileRef = doc(db, 'profile', 'barber');
      await setDoc(profileRef, profile);
    } catch (error) {
      console.error('Error setting profile:', error);
      localStorage.setItem('barberProfile', JSON.stringify(profile));
    }
  },

  getBookings: async () => {
    try {
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting bookings:', error);
      const bookings = localStorage.getItem('bookings');
      return bookings ? JSON.parse(bookings) : [];
    }
  },

  addBooking: async (booking) => {
    try {
      const bookingsRef = collection(db, 'bookings');
      const docRef = await addDoc(bookingsRef, {
        ...booking,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      return { id: docRef.id, ...booking };
    } catch (error) {
      console.error('Error adding booking:', error);
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      const newBooking = { ...booking, id: Date.now(), createdAt: new Date().toISOString(), status: 'pending' };
      bookings.push(newBooking);
      localStorage.setItem('bookings', JSON.stringify(bookings));
      return newBooking;
    }
  },

  updateBooking: async (id, updates) => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      await updateDoc(bookingRef, updates);
    } catch (error) {
      console.error('Error updating booking:', error);
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      const updated = bookings.map(b => b.id === id ? { ...b, ...updates } : b);
      localStorage.setItem('bookings', JSON.stringify(updated));
    }
  },

  deleteBooking: async (id) => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      await deleteDoc(bookingRef);
    } catch (error) {
      console.error('Error deleting booking:', error);
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      const filtered = bookings.filter(b => b.id !== id);
      localStorage.setItem('bookings', JSON.stringify(filtered));
    }
  },

  requestNotificationPermission: async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        try {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          console.log('FCM Token:', token);
          // Save token to Firestore for push notifications
          const tokenRef = doc(db, 'fcmTokens', 'barber');
          await setDoc(tokenRef, { token, updatedAt: new Date().toISOString() });
          return true;
        } catch (error) {
          console.error('Error getting notification token:', error);
          return true; // Still return true if permission granted
        }
      }
    }
    return false;
  },

  sendNotification: (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://i.imgur.com/QTjOcy7.png',
        badge: 'https://i.imgur.com/QTjOcy7.png',
        tag: 'booking-notification'
      });
    }
  }
};

const StyleUpApp = () => {
  const [isBarberLoggedIn, setIsBarberLoggedIn] = useState(false);
  const [view, setView] = useState('client');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem('barberLoggedIn');
    if (loggedIn === 'true') {
      setIsBarberLoggedIn(true);
      setView('dashboard');
      checkNotificationPermission();
    }
  }, []);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const handleLogin = (username, password) => {
    const usernameHash = simpleHash(username);
    const passwordHash = simpleHash(password);
    
    if (usernameHash === credentials.usernameHash && 
        passwordHash === credentials.passwordHash) {
      setIsBarberLoggedIn(true);
      localStorage.setItem('barberLoggedIn', 'true');
      setView('dashboard');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsBarberLoggedIn(false);
    localStorage.removeItem('barberLoggedIn');
    setView('client');
  };

  const enableNotifications = async () => {
    const granted = await FirebaseHelpers.requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      FirebaseHelpers.sendNotification(
        'Notifications Enabled!',
        'You will receive alerts for new bookings'
      );
    }
  };

  return (
    <div style={{
      fontFamily: '"Crimson Pro", "Playfair Display", Georgia, serif',
      backgroundColor: '#0a0a0a',
      minHeight: '100vh',
      color: '#f5f5f5'
    }}>
      {view === 'client' && <ClientProfileView onAdminClick={() => setView('login')} isBarberLoggedIn={isBarberLoggedIn} onManageBookings={() => setView('bookings')} onEditProfile={() => setView('editProfile')} />}
      {view === 'login' && <LoginPage onLogin={handleLogin} onBack={() => setView('client')} />}
      {view === 'dashboard' && isBarberLoggedIn && (
        <BarberDashboard 
          onLogout={handleLogout}
          onViewBookings={() => setView('bookings')}
          onEditProfile={() => setView('editProfile')}
          onViewProfile={() => setView('client')}
          notificationsEnabled={notificationsEnabled}
          onEnableNotifications={enableNotifications}
        />
      )}
      {view === 'bookings' && isBarberLoggedIn && (
        <BookingsManagement onBack={() => setView('dashboard')} />
      )}
      {view === 'editProfile' && isBarberLoggedIn && (
        <EditProfile onBack={() => setView('dashboard')} />
      )}
    </div>
  );
};

// Client Profile View (Public)
const ClientProfileView = ({ onAdminClick, isBarberLoggedIn, onManageBookings, onEditProfile }) => {
  const [profile, setProfile] = useState(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    clientName: '',
    clientPhone: '',
    date: '',
    time: ''
  });
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  useEffect(() => {
    // Load profile from Firebase
    FirebaseHelpers.getProfile().then(setProfile);
  }, []);

  if (!profile) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Loading...</div>;
  }

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      slots.push(`${displayHour}:00 ${period}`);
      if (hour < 18) {
        slots.push(`${displayHour}:30 ${period}`);
      }
    }
    return slots;
  };

  const getNextDays = (numDays = 14) => {
    const days = [];
    for (let i = 1; i <= numDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const handleBooking = async () => {
    if (!bookingData.clientName || !bookingData.clientPhone || !bookingData.date || !bookingData.time) {
      alert('Please fill in all fields');
      return;
    }

    const newBooking = {
      ...bookingData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await FirebaseHelpers.addBooking(newBooking);

    // Send notification to barber (if notifications enabled)
    FirebaseHelpers.sendNotification(
      'New Booking Request!',
      `${bookingData.clientName} - ${bookingData.time} on ${new Date(bookingData.date).toLocaleDateString()}`
    );

    setBookingConfirmed(true);
    setTimeout(() => {
      setBookingModal(false);
      setBookingConfirmed(false);
      setBookingData({
        clientName: '',
        clientPhone: '',
        date: '',
        time: ''
      });
    }, 2000);
  };

  return (
    <div>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 215, 186, 0.1)',
        zIndex: 100,
        padding: '20px 0'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Scissors size={28} color="#ffd7ba" strokeWidth={1.5} />
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '400',
              letterSpacing: '0.5px',
              color: '#ffd7ba'
            }}>StyleUp</h1>
          </div>
          <button
            onClick={onAdminClick}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: '4px 8px'
            }}
          >
            Admin
          </button>
        </div>
      </header>

      {/* Profile Section */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <img
            src={profile.profileImage}
            alt={profile.name}
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              border: '4px solid rgba(255, 215, 186, 0.3)',
              marginBottom: '24px',
              objectFit: 'cover'
            }}
          />
          <h2 style={{
            fontSize: '36px',
            fontWeight: '300',
            margin: '0 0 8px 0',
            letterSpacing: '0.5px'
          }}>
            {profile.name}
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#ffd7ba',
            margin: '0 0 16px 0'
          }}>
            {profile.specialty}
          </p>
          <p style={{
            fontSize: '16px',
            color: '#aaa',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto 24px'
          }}>
            {profile.bio}
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            fontSize: '15px',
            color: '#999',
            marginBottom: '32px'
          }}>
            <div>{profile.location}</div>
            <div>•</div>
            <div>{profile.phone}</div>
          </div>

          <button
            onClick={() => setBookingModal(true)}
            style={{
              padding: '16px 48px',
              backgroundColor: '#ffd7ba',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '6px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              letterSpacing: '0.5px',
              fontFamily: 'inherit',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => {
              e.target.style.backgroundColor = '#ffb88c';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.target.style.backgroundColor = '#ffd7ba';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Book Now
          </button>

          {/* Admin Buttons (shown when barber is logged in) */}
          {isBarberLoggedIn && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '16px'
            }}>
              <button
                onClick={onManageBookings}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#1a1a1a',
                  color: '#ffd7ba',
                  border: '1px solid rgba(255, 215, 186, 0.3)',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={e => {
                  e.target.style.backgroundColor = 'rgba(255, 215, 186, 0.1)';
                  e.target.style.borderColor = '#ffd7ba';
                }}
                onMouseLeave={e => {
                  e.target.style.backgroundColor = '#1a1a1a';
                  e.target.style.borderColor = 'rgba(255, 215, 186, 0.3)';
                }}
              >
                Manage Bookings
              </button>
              <button
                onClick={onEditProfile}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#1a1a1a',
                  color: '#ffd7ba',
                  border: '1px solid rgba(255, 215, 186, 0.3)',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={e => {
                  e.target.style.backgroundColor = 'rgba(255, 215, 186, 0.1)';
                  e.target.style.borderColor = '#ffd7ba';
                }}
                onMouseLeave={e => {
                  e.target.style.backgroundColor = '#1a1a1a';
                  e.target.style.borderColor = 'rgba(255, 215, 186, 0.3)';
                }}
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px'
        }}>
          {profile.gallery.map((img, idx) => (
            <div
              key={idx}
              style={{
                paddingBottom: '100%',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#141414'
              }}
            >
              <img
                src={img}
                alt={`Work ${idx + 1}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.3s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Booking Modal */}
      {bookingModal && (
        <BookingModal
          bookingData={bookingData}
          setBookingData={setBookingData}
          onClose={() => setBookingModal(false)}
          onSubmit={handleBooking}
          confirmed={bookingConfirmed}
          timeSlots={generateTimeSlots()}
          availableDates={getNextDays()}
        />
      )}
    </div>
  );
};

// Booking Modal Component
const BookingModal = ({ bookingData, setBookingData, onClose, onSubmit, confirmed, timeSlots, availableDates }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: '#141414',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid rgba(255, 215, 186, 0.1)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#999',
            fontSize: '28px',
            cursor: 'pointer',
            lineHeight: 1,
            padding: '4px 8px'
          }}
        >
          ×
        </button>

        {confirmed ? (
          <div style={{ padding: '80px 48px', textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 215, 186, 0.1)',
              border: '2px solid #ffd7ba',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '40px'
            }}>
              ✓
            </div>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '300',
              margin: '0 0 12px 0',
              color: '#ffd7ba'
            }}>
              Booking Submitted!
            </h3>
            <p style={{ fontSize: '16px', color: '#999', margin: 0 }}>
              Your booking is pending confirmation
            </p>
          </div>
        ) : (
          <div style={{ padding: '32px' }}>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '300',
              margin: '0 0 24px 0',
              letterSpacing: '0.5px'
            }}>
              Book Appointment
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#ffd7ba',
                marginBottom: '8px'
              }}>
                Your Name
              </label>
              <input
                type="text"
                value={bookingData.clientName}
                onChange={e => setBookingData({...bookingData, clientName: e.target.value})}
                placeholder="John Smith"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid rgba(255, 215, 186, 0.1)',
                  borderRadius: '6px',
                  color: '#f5f5f5',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#ffd7ba',
                marginBottom: '8px'
              }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={bookingData.clientPhone}
                onChange={e => setBookingData({...bookingData, clientPhone: e.target.value})}
                placeholder="(555) 123-4567"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid rgba(255, 215, 186, 0.1)',
                  borderRadius: '6px',
                  color: '#f5f5f5',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#ffd7ba',
                marginBottom: '8px'
              }}>
                Select Date
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px'
              }}>
                {availableDates.map((date, idx) => {
                  const dateObj = new Date(date);
                  const isSelected = bookingData.date === date;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBookingData({...bookingData, date: date})}
                      style={{
                        padding: '12px 4px',
                        backgroundColor: isSelected ? '#ffd7ba' : '#1a1a1a',
                        color: isSelected ? '#0a0a0a' : '#f5f5f5',
                        border: '1px solid rgba(255, 215, 186, 0.1)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                        transition: 'all 0.3s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.target.style.borderColor = '#ffd7ba';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.target.style.borderColor = 'rgba(255, 215, 186, 0.1)';
                      }}
                    >
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>
                        {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>
                        {dateObj.getDate()}
                      </div>
                      <div style={{ fontSize: '9px', opacity: 0.6 }}>
                        {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#ffd7ba',
                marginBottom: '8px'
              }}>
                Select Time
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px'
              }}>
                {timeSlots.map((time, idx) => {
                  const isSelected = bookingData.time === time;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBookingData({...bookingData, time: time})}
                      style={{
                        padding: '12px 8px',
                        backgroundColor: isSelected ? '#ffd7ba' : '#1a1a1a',
                        color: isSelected ? '#0a0a0a' : '#f5f5f5',
                        border: '1px solid rgba(255, 215, 186, 0.1)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.target.style.borderColor = '#ffd7ba';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.target.style.borderColor = 'rgba(255, 215, 186, 0.1)';
                      }}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={onSubmit}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#ffd7ba',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.3s',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#ffb88c'}
              onMouseLeave={e => e.target.style.backgroundColor = '#ffd7ba'}
            >
              Submit Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Login Page
const LoginPage = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setError('Invalid credentials');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: '#141414',
        border: '1px solid rgba(255, 215, 186, 0.1)',
        borderRadius: '12px',
        padding: '48px',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Scissors size={48} color="#ffd7ba" strokeWidth={1.5} style={{ margin: '0 auto 16px' }} />
          <h2 style={{
            fontSize: '32px',
            fontWeight: '300',
            margin: '0 0 8px 0',
            letterSpacing: '0.5px'
          }}>
            Barber Login
          </h2>
          <p style={{ fontSize: '15px', color: '#999', margin: 0 }}>
            Access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#ffd7ba',
              marginBottom: '8px'
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 215, 186, 0.1)',
                borderRadius: '6px',
                color: '#f5f5f5',
                fontSize: '15px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#ffd7ba',
              marginBottom: '8px'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 215, 186, 0.1)',
                borderRadius: '6px',
                color: '#f5f5f5',
                fontSize: '15px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(255, 100, 100, 0.1)',
              border: '1px solid rgba(255, 100, 100, 0.3)',
              borderRadius: '6px',
              color: '#ff6464',
              fontSize: '14px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#ffd7ba',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.3s',
              letterSpacing: '0.5px',
              marginBottom: '16px'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#ffb88c'}
            onMouseLeave={e => e.target.style.backgroundColor = '#ffd7ba'}
          >
            Login
          </button>

          <button
            type="button"
            onClick={onBack}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              color: '#999',
              border: '1px solid rgba(255, 215, 186, 0.2)',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => {
              e.target.style.borderColor = '#ffd7ba';
              e.target.style.color = '#ffd7ba';
            }}
            onMouseLeave={e => {
              e.target.style.borderColor = 'rgba(255, 215, 186, 0.2)';
              e.target.style.color = '#999';
            }}
          >
            Back to Profile
          </button>
        </form>
      </div>
    </div>
  );
};

// Barber Dashboard
const BarberDashboard = ({ onLogout, onViewBookings, onEditProfile, onViewProfile, notificationsEnabled, onEnableNotifications }) => {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  
  useEffect(() => {
    // Load initial data
    FirebaseHelpers.getProfile().then(setProfile);
    FirebaseHelpers.getBookings().then(setBookings);
    
    // Refresh bookings periodically and listen to realtime updates
    const interval = setInterval(async () => {
      const updatedBookings = await FirebaseHelpers.getBookings();
      setBookings(updatedBookings);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  if (!profile) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Loading...</div>;
  }

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const todayBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date).toDateString();
    const today = new Date().toDateString();
    return bookingDate === today;
  }).length;

  return (
    <div>
      <header style={{
        backgroundColor: '#141414',
        borderBottom: '1px solid rgba(255, 215, 186, 0.1)',
        padding: '20px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Scissors size={28} color="#ffd7ba" strokeWidth={1.5} />
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '400',
              letterSpacing: '0.5px',
              color: '#ffd7ba'
            }}>Dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {!notificationsEnabled && (
              <button
                onClick={onEnableNotifications}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 215, 186, 0.1)',
                  border: '1px solid #ffd7ba',
                  color: '#ffd7ba',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255, 215, 186, 0.2)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'rgba(255, 215, 186, 0.1)'}
              >
                <Bell size={16} />
                Enable Notifications
              </button>
            )}
            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: '1px solid rgba(255, 215, 186, 0.2)',
                color: '#ffd7ba',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.3s'
              }}
              onMouseEnter={e => e.target.style.borderColor = '#ffd7ba'}
              onMouseLeave={e => e.target.style.borderColor = 'rgba(255, 215, 186, 0.2)'}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Notification Status */}
        {notificationsEnabled && (
          <div style={{
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '8px',
            padding: '16px 24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#4ade80'
          }}>
            <Bell size={20} />
            <span>Push notifications enabled - You'll be alerted of new bookings</span>
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          <div style={{
            backgroundColor: '#141414',
            border: '1px solid rgba(255, 215, 186, 0.1)',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>
              Pending Bookings
            </div>
            <div style={{ fontSize: '36px', fontWeight: '300', color: '#ffd7ba' }}>
              {pendingCount}
            </div>
          </div>
          <div style={{
            backgroundColor: '#141414',
            border: '1px solid rgba(255, 215, 186, 0.1)',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>
              Today's Appointments
            </div>
            <div style={{ fontSize: '36px', fontWeight: '300', color: '#ffd7ba' }}>
              {todayBookings}
            </div>
          </div>
          <div style={{
            backgroundColor: '#141414',
            border: '1px solid rgba(255, 215, 186, 0.1)',
            borderRadius: '8px',
            padding: '24px'
          }}>
            <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>
              Total Bookings
            </div>
            <div style={{ fontSize: '36px', fontWeight: '300', color: '#ffd7ba' }}>
              {bookings.length}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 style={{
          fontSize: '28px',
          fontWeight: '300',
          margin: '0 0 24px 0',
          letterSpacing: '0.5px'
        }}>
          Quick Actions
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          <ActionCard
            icon={<Calendar size={32} />}
            title="Manage Bookings"
            description="View and confirm pending appointments"
            onClick={onViewBookings}
          />
          <ActionCard
            icon={<Edit2 size={32} />}
            title="Edit Profile"
            description="Update your profile info and gallery"
            onClick={onEditProfile}
          />
          <ActionCard
            icon={<Scissors size={32} />}
            title="View Public Profile"
            description="See how clients view your profile"
            onClick={onViewProfile}
          />
        </div>
      </main>
    </div>
  );
};

const ActionCard = ({ icon, title, description, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#141414',
        border: '1px solid rgba(255, 215, 186, 0.1)',
        borderRadius: '8px',
        padding: '32px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        borderColor: isHovered ? '#ffd7ba' : 'rgba(255, 215, 186, 0.1)'
      }}
    >
      <div style={{ color: '#ffd7ba', marginBottom: '16px' }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '22px',
        fontWeight: '400',
        margin: '0 0 8px 0',
        color: '#f5f5f5'
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '15px',
        color: '#999',
        margin: 0,
        lineHeight: '1.5'
      }}>
        {description}
      </p>
    </div>
  );
};

// Bookings Management (continued in next part due to length...)
const BookingsManagement = ({ onBack }) => {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Load initial bookings
    FirebaseHelpers.getBookings().then(setBookings);
    
    // Refresh periodically
    const interval = setInterval(async () => {
      const updatedBookings = await FirebaseHelpers.getBookings();
      setBookings(updatedBookings);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const updateBookingStatus = async (id, status) => {
    await FirebaseHelpers.updateBooking(id, { status });
    const updatedBookings = await FirebaseHelpers.getBookings();
    setBookings(updatedBookings);
  };

  const deleteBooking = async (id) => {
    await FirebaseHelpers.deleteBooking(id);
    const updatedBookings = await FirebaseHelpers.getBookings();
    setBookings(updatedBookings);
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter);

  return (
    <div>
      <header style={{
        backgroundColor: '#141414',
        borderBottom: '1px solid rgba(255, 215, 186, 0.1)',
        padding: '20px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: '400',
            letterSpacing: '0.5px',
            color: '#ffd7ba'
          }}>Manage Bookings</h1>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: '1px solid rgba(255, 215, 186, 0.2)',
              color: '#ffd7ba',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => e.target.style.borderColor = '#ffd7ba'}
            onMouseLeave={e => e.target.style.borderColor = 'rgba(255, 215, 186, 0.2)'}
          >
            ← Back
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '32px'
        }}>
          {['all', 'pending', 'confirmed', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '10px 20px',
                backgroundColor: filter === f ? '#ffd7ba' : '#1a1a1a',
                color: filter === f ? '#0a0a0a' : '#f5f5f5',
                border: '1px solid rgba(255, 215, 186, 0.1)',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
                transition: 'all 0.3s'
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {filteredBookings.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            color: '#666'
          }}>
            <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: '18px', margin: 0 }}>No bookings found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onConfirm={() => updateBookingStatus(booking.id, 'confirmed')}
                onCancel={() => updateBookingStatus(booking.id, 'cancelled')}
                onDelete={() => deleteBooking(booking.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const BookingCard = ({ booking, onConfirm, onCancel, onDelete }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffd700';
      case 'confirmed': return '#4ade80';
      case 'cancelled': return '#ff6464';
      default: return '#999';
    }
  };

  return (
    <div style={{
      backgroundColor: '#141414',
      border: '1px solid rgba(255, 215, 186, 0.1)',
      borderRadius: '8px',
      padding: '24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '24px'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '400',
            margin: 0,
            color: '#f5f5f5'
          }}>
            {booking.clientName}
          </h3>
          <span style={{
            padding: '4px 12px',
            backgroundColor: `${getStatusColor(booking.status)}20`,
            color: getStatusColor(booking.status),
            borderRadius: '12px',
            fontSize: '12px',
            textTransform: 'capitalize'
          }}>
            {booking.status}
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          fontSize: '15px',
          color: '#999'
        }}>
          <div>
            <strong style={{ color: '#ffd7ba' }}>Date:</strong> {new Date(booking.date).toLocaleDateString()}
          </div>
          <div>
            <strong style={{ color: '#ffd7ba' }}>Time:</strong> {booking.time}
          </div>
          <div>
            <strong style={{ color: '#ffd7ba' }}>Phone:</strong> {booking.clientPhone}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {booking.status === 'pending' && (
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4ade80',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = '#22c55e'}
            onMouseLeave={e => e.target.style.backgroundColor = '#4ade80'}
          >
            <Check size={16} /> Confirm
          </button>
        )}
        {booking.status !== 'cancelled' && (
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '#ff6464',
              border: '1px solid #ff6464',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255, 100, 100, 0.1)'}
            onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
          >
            Cancel
          </button>
        )}
        <button
          onClick={onDelete}
          style={{
            padding: '10px',
            backgroundColor: 'transparent',
            color: '#666',
            border: '1px solid rgba(255, 215, 186, 0.1)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseEnter={e => {
            e.target.style.borderColor = '#ff6464';
            e.target.style.color = '#ff6464';
          }}
          onMouseLeave={e => {
            e.target.style.borderColor = 'rgba(255, 215, 186, 0.1)';
            e.target.style.color = '#666';
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

// Edit Profile (same as before, keeping it simple)
const EditProfile = ({ onBack }) => {
  const [profile, setProfile] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    FirebaseHelpers.getProfile().then(setProfile);
  }, []);

  const handleSave = async () => {
    await FirebaseHelpers.setProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!profile) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Loading...</div>;
  }

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'profile') {
          setProfile({ ...profile, profileImage: reader.result });
        } else {
          setProfile({ 
            ...profile, 
            gallery: [...profile.gallery, reader.result] 
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeGalleryImage = (index) => {
    const newGallery = profile.gallery.filter((_, i) => i !== index);
    setProfile({ ...profile, gallery: newGallery });
  };

  return (
    <div>
      <header style={{
        backgroundColor: '#141414',
        borderBottom: '1px solid rgba(255, 215, 186, 0.1)',
        padding: '20px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: '400',
            letterSpacing: '0.5px',
            color: '#ffd7ba'
          }}>Edit Profile</h1>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: '1px solid rgba(255, 215, 186, 0.2)',
              color: '#ffd7ba',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => e.target.style.borderColor = '#ffd7ba'}
            onMouseLeave={e => e.target.style.borderColor = 'rgba(255, 215, 186, 0.2)'}
          >
            ← Back
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <img
            src={profile.profileImage}
            alt="Profile"
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              border: '4px solid rgba(255, 215, 186, 0.3)',
              marginBottom: '16px',
              objectFit: 'cover'
            }}
          />
          <div>
            <label style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#1a1a1a',
              color: '#ffd7ba',
              border: '1px solid rgba(255, 215, 186, 0.2)',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.3s'
            }}>
              <Upload size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'profile')}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        <div style={{
          backgroundColor: '#141414',
          border: '1px solid rgba(255, 215, 186, 0.1)',
          borderRadius: '8px',
          padding: '32px',
          marginBottom: '32px'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#ffd7ba',
              marginBottom: '8px'
            }}>
              Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 215, 186, 0.1)',
                borderRadius: '6px',
                color: '#f5f5f5',
                fontSize: '15px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#ffd7ba',
              marginBottom: '8px'
            }}>
              Specialty
            </label>
            <input
              type="text"
              value={profile.specialty}
              onChange={e => setProfile({ ...profile, specialty: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 215, 186, 0.1)',
                borderRadius: '6px',
                color: '#f5f5f5',
                fontSize: '15px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#ffd7ba',
              marginBottom: '8px'
            }}>
              Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 215, 186, 0.1)',
                borderRadius: '6px',
                color: '#f5f5f5',
                fontSize: '15px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#ffd7ba',
              marginBottom: '8px'
            }}>
              Location
            </label>
            <input
              type="text"
              value={profile.location}
              onChange={e => setProfile({ ...profile, location: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 215, 186, 0.1)',
                borderRadius: '6px',
                color: '#f5f5f5',
                fontSize: '15px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#ffd7ba',
              marginBottom: '8px'
            }}>
              Phone
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={e => setProfile({ ...profile, phone: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 215, 186, 0.1)',
                borderRadius: '6px',
                color: '#f5f5f5',
                fontSize: '15px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{
          backgroundColor: '#141414',
          border: '1px solid rgba(255, 215, 186, 0.1)',
          borderRadius: '8px',
          padding: '32px',
          marginBottom: '32px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '400',
            margin: '0 0 16px 0',
            color: '#ffd7ba'
          }}>
            Gallery
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {profile.gallery.map((img, idx) => (
              <div
                key={idx}
                style={{
                  paddingBottom: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '6px'
                }}
              >
                <img
                  src={img}
                  alt={`Gallery ${idx + 1}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <button
                  onClick={() => removeGalleryImage(idx)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ff6464',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255, 100, 100, 0.2)'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <label style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#1a1a1a',
            color: '#ffd7ba',
            border: '1px solid rgba(255, 215, 186, 0.2)',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.3s'
          }}>
            <Upload size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Add Photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'gallery')}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#ffd7ba',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.3s',
            letterSpacing: '0.5px'
          }}
          onMouseEnter={e => e.target.style.backgroundColor = '#ffb88c'}
          onMouseLeave={e => e.target.style.backgroundColor = '#ffd7ba'}
        >
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </main>
    </div>
  );
};

export default StyleUpApp;