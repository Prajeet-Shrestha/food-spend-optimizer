import { ObjectId } from 'mongodb';
import clientPromise from './mongodb';
import { Bookmark, LogEntry, Suggestion } from '@/types';
import { RecordType } from '@/types';
import { Settings } from './config';

const DB_NAME = 'food_spend_optimizer';
const COLLECTION_NAME = 'logs';
const SETTINGS_COLLECTION_NAME = 'settings';
const SETTINGS_DOC_ID = 'app_settings';
const BOOKMARKS_COLLECTION_NAME = 'suggestion_bookmarks';

interface BookmarkDoc {
  _id: ObjectId;
  suggestion: Suggestion;
  menuKey: string;
  bookmarkedAt: string;
}

function normalizeMenuKey(menu: string): string {
  return menu.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function getLogsCollection() {
  const db = await getDb();
  return db.collection<LogEntry>(COLLECTION_NAME);
}

export async function getSettingsCollection() {
  const db = await getDb();
  return db.collection<Settings & { _id: string }>(SETTINGS_COLLECTION_NAME);
}

// Get settings from MongoDB, return null if not found
export async function getSettingsFromDb(): Promise<Settings | null> {
  try {
    const collection = await getSettingsCollection();
    const settings = await collection.findOne({ _id: SETTINGS_DOC_ID });
    if (settings) {
      const { _id, ...settingsData } = settings;
      return settingsData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching settings from DB:', error);
    return null;
  }
}

// Save settings to MongoDB
export async function saveSettingsToDb(settings: Settings): Promise<void> {
  const collection = await getSettingsCollection();
  await collection.updateOne(
    { _id: SETTINGS_DOC_ID },
    { $set: { ...settings, _id: SETTINGS_DOC_ID, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}

// Initialize indexes on first use
export async function ensureIndexes() {
  const collection = await getLogsCollection();

  // Index on date for efficient date range queries
  await collection.createIndex({ date: 1 });

  // Index on recordType for filtering
  await collection.createIndex({ recordType: 1 });

  // Compound index for common queries
  await collection.createIndex({ recordType: 1, date: -1 });

  // Bookmarks indexes
  const bookmarks = await getBookmarksCollection();
  await bookmarks.createIndex({ menuKey: 1 }, { unique: true });
  await bookmarks.createIndex({ bookmarkedAt: -1 });
}

// ===== Bookmarks =====

export async function getBookmarksCollection() {
  const db = await getDb();
  return db.collection<BookmarkDoc>(BOOKMARKS_COLLECTION_NAME);
}

export class EmptyMenuError extends Error {
  constructor() {
    super('Suggestion menu is required');
    this.name = 'EmptyMenuError';
  }
}

export async function addBookmark(
  suggestion: Suggestion
): Promise<{ doc: Bookmark; created: boolean }> {
  const menuKey = normalizeMenuKey(suggestion.menu || '');
  if (!menuKey) throw new EmptyMenuError();

  const collection = await getBookmarksCollection();
  const bookmarkedAt = new Date().toISOString();
  const newDoc: BookmarkDoc = {
    _id: new ObjectId(),
    suggestion,
    menuKey,
    bookmarkedAt,
  };

  try {
    await collection.insertOne(newDoc);
    return { doc: toBookmark(newDoc), created: true };
  } catch (err: unknown) {
    // Mongo duplicate key
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000) {
      const existing = await collection.findOne({ menuKey });
      if (existing) return { doc: toBookmark(existing), created: false };
    }
    throw err;
  }
}

export async function listBookmarks(): Promise<Bookmark[]> {
  const collection = await getBookmarksCollection();
  const docs = await collection.find({}).sort({ bookmarkedAt: -1 }).toArray();
  return docs.map(toBookmark);
}

export async function deleteBookmarkById(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const collection = await getBookmarksCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

function toBookmark(doc: BookmarkDoc): Bookmark {
  return {
    _id: doc._id.toString(),
    suggestion: doc.suggestion,
    bookmarkedAt: doc.bookmarkedAt,
  };
}

// Helper to get all logs with optional filters
export async function getAllLogs(filters?: {
  type?: RecordType;
  from?: string;
  to?: string;
}): Promise<LogEntry[]> {
  const collection = await getLogsCollection();
  
  const query: any = {};
  
  if (filters?.type) {
    query.recordType = filters.type;
  }
  
  if (filters?.from || filters?.to) {
    query.date = {};
    if (filters.from) {
      query.date.$gte = filters.from;
    }
    if (filters.to) {
      query.date.$lte = filters.to;
    }
  }
  
  const logs = await collection
    .find(query)
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  
  return logs.map(log => ({
    ...log,
    _id: log._id?.toString(),
  })) as LogEntry[];
}

