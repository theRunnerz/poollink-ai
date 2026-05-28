import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const schedules = [
  {
    id: 'acadia',
    hours: "Mon: 1:00 PM - 4:30 PM | Tue: 12:30 PM - 8:30 PM | Wed: 6:00 AM - 8:30 PM | Thu: 12:30 PM - 8:30 PM | Fri: Closed | Sat: Closed | Sun: Closed",
    source: 'google maps'
  },
  {
    id: 'renfrew',
    hours: "Mon-Fri: 5:30 AM - 10:00 PM | Sat: 7:00 AM - 8:00 PM | Sun: 7:00 AM - 6:00 PM",
    source: 'official website'
  },
  {
    id: 'killarney',
    hours: "Mon-Fri: 5:30 AM - 10:00 PM | Sat: 7:00 AM - 4:00 PM | Sun: 8:00 AM - 4:00 PM",
    source: 'official website'
  },
  {
    id: 'inglewood',
    hours: "Mon-Fri: 11:30 AM - 7:00 PM | Sat-Sun: 12:00 PM - 4:00 PM",
    source: 'official website'
  },
  {
    id: 'shouldice',
    hours: "Mon-Fri: 5:30 AM - 10:00 PM | Sat: 7:30 AM - 4:00 PM | Sun: 8:00 AM - 4:00 PM",
    source: 'official website'
  }
];

async function seedSchedules() {
  console.log("Seeding verified schedules...");
  for (const s of schedules) {
    try {
      await setDoc(doc(db, 'pool_schedules', s.id), {
        poolId: s.id,
        hours: s.hours,
        lastUpdated: serverTimestamp(),
        source: s.source
      });
      console.log(`Seeded ${s.id}`);
    } catch (error) {
      console.error(`Error seeding ${s.id}:`, error);
    }
  }
}

seedSchedules();
