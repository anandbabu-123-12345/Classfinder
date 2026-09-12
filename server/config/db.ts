import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseState {
  users: any[];
  classrooms: any[];
  timetables: any[];
  reservations: any[];
  otps: any[];
  auditLogs: any[];
  officialTimetables?: Record<string, any[]>;
  extraReservations?: any[];
}

const defaultState: DatabaseState = {
  users: [],
  classrooms: [],
  timetables: [],
  reservations: [],
  otps: [],
  auditLogs: [],
  officialTimetables: {},
  extraReservations: [],
};

class LocalDB {
  private data: DatabaseState = { ...defaultState };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading local db file:', err);
      this.data = { ...defaultState };
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving local db file:', err);
    }
  }

  public get<K extends keyof DatabaseState>(collection: K): DatabaseState[K] {
    if (this.data[collection] !== undefined) {
      return this.data[collection];
    }
    return (collection === 'officialTimetables' ? {} : []) as unknown as DatabaseState[K];
  }

  public set<K extends keyof DatabaseState>(collection: K, items: DatabaseState[K]) {
    this.data[collection] = items;
    this.save();
  }
}

export const localDb = new LocalDB();

let isMongoConnected = false;

export async function connectDB(): Promise<boolean> {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri || !rawUri.trim()) {
    console.log('ℹ️ MONGODB_URI not configured. Using durable persistent local document store (./data/db.json).');
    return false;
  }

  // Sanitize common Atlas copy-paste artifact: '<password>' -> 'password'
  const uri = rawUri.trim().replace(/<([^>]+)>/g, '$1');

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500,
    });
    isMongoConnected = true;
    console.log('✅ MongoDB Atlas connected successfully');
    return true;
  } catch (err: any) {
    // Disconnect cleanly if connection attempt failed
    await mongoose.disconnect().catch(() => {});
    isMongoConnected = false;
    console.log(`ℹ️ MongoDB Atlas connection unavailable (${err.message}). Seamlessly using persistent local document store (./data/db.json).`);
    return false;
  }
}

export function isUsingMongoAtlas(): boolean {
  return isMongoConnected;
}
