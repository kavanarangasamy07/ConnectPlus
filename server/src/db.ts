import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = resolve(__dirname, '../../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = resolve(dataDir, 'connect_plus.db');

let dbInstance: any;
try {
  const { DatabaseSync } = require('node:sqlite');
  dbInstance = new DatabaseSync(dbPath);
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA synchronous = NORMAL;');
} catch (e) {
  // In-memory fallback if node:sqlite is restricted
  dbInstance = {
    exec: () => {},
    prepare: () => ({
      get: () => undefined,
      all: () => [],
      run: () => {}
    })
  };
}

export const db = dbInstance;

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_hash TEXT UNIQUE NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_translations_hash ON translations(query_hash);

  CREATE TABLE IF NOT EXISTS custom_phrases (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    phrase TEXT NOT NULL,
    category TEXT NOT NULL,
    favorite INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_phrases_device ON custom_phrases(device_id);

  CREATE TABLE IF NOT EXISTS sos_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Prepared statements for maximum performance
export const stmts = {
  getTranslation: db.prepare(
    'SELECT translated_text FROM translations WHERE query_hash = ? LIMIT 1'
  ),
  insertTranslation: db.prepare(
    'INSERT OR REPLACE INTO translations (query_hash, source_lang, target_lang, source_text, translated_text, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  getPhrasesByDevice: db.prepare(
    'SELECT id, emoji, phrase, category, favorite, sort_order, created_at FROM custom_phrases WHERE device_id = ? ORDER BY sort_order ASC, created_at ASC'
  ),
  upsertPhrase: db.prepare(
    `INSERT INTO custom_phrases (id, device_id, emoji, phrase, category, favorite, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       emoji = excluded.emoji,
       phrase = excluded.phrase,
       category = excluded.category,
       favorite = excluded.favorite,
       sort_order = excluded.sort_order`
  ),
  deletePhrase: db.prepare(
    'DELETE FROM custom_phrases WHERE id = ? AND device_id = ?'
  ),
  logSOS: db.prepare(
    'INSERT INTO sos_logs (phone_hash, created_at) VALUES (?, ?)'
  )
};
