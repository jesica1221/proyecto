const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const defaultDatabasePath = path.join(__dirname, 'data', 'parking.sqlite');
const zoneSeed = [
  { id: 1, name: 'Administrativa', type: 'car', capacity: 25 },
  { id: 2, name: 'Biblioteca', type: 'car', capacity: 20 },
  { id: 3, name: 'Auditorio', type: 'car', capacity: 20 },
  { id: 4, name: 'Cafetería', type: 'motorcycle', capacity: 30 },
  { id: 5, name: 'Laboratorios', type: 'motorcycle', capacity: 30 },
];

function openDatabase(databasePath = process.env.SQLITE_PATH || defaultDatabasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma(`journal_mode = ${process.env.SQLITE_JOURNAL_MODE === 'DELETE' ? 'DELETE' : 'WAL'}`);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student', 'admin', 'security', 'visitor')),
      plate TEXT NOT NULL DEFAULT '',
      vehicle_type TEXT NOT NULL DEFAULT 'car',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      capacity INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS parking_spaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL REFERENCES zones(id),
      number INTEGER NOT NULL,
      UNIQUE (zone_id, number)
    );
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      space_id INTEGER NOT NULL REFERENCES parking_spaces(id),
      status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'completed', 'expired')),
      created_at TEXT NOT NULL,
      expires_at TEXT,
      ended_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_reservation_per_space
      ON reservations(space_id) WHERE status = 'active';
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_reservation_per_user
      ON reservations(user_id) WHERE status = 'active';
    CREATE TABLE IF NOT EXISTS parking_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER REFERENCES reservations(id),
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const seedZones = db.prepare(
    'INSERT OR IGNORE INTO zones (id, name, vehicle_type, capacity) VALUES (?, ?, ?, ?)',
  );
  const seedSpaces = db.prepare(
    'INSERT OR IGNORE INTO parking_spaces (zone_id, number) VALUES (?, ?)',
  );
  const seed = db.transaction(() => {
    for (const zone of zoneSeed) {
      seedZones.run(zone.id, zone.name, zone.type, zone.capacity);
      for (let number = 1; number <= zone.capacity; number += 1) {
        seedSpaces.run(zone.id, number);
      }
    }
  });
  seed();

  if (process.env.NODE_ENV !== 'production' && process.env.DEMO_DATA !== 'false') {
    const addDemoUser = db.prepare(`
      INSERT OR IGNORE INTO users (cedula, name, password_hash, role, plate, vehicle_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const demo of [
      ['1000000001', 'Estudiante Demo', 'student', 'ABC123', 'car'],
      ['1000000002', 'Administrador Demo', 'admin', '', 'car'],
      ['1000000003', 'Seguridad Demo', 'security', '', 'car'],
    ]) {
      addDemoUser.run(
        demo[0],
        demo[1],
        bcrypt.hashSync('Demo2026!Parking', 10),
        demo[2],
        demo[3],
        demo[4],
        now,
      );
    }
  }

  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (bootstrapPassword) {
    const cedula = process.env.BOOTSTRAP_ADMIN_ID;
    if (!cedula || bootstrapPassword.length < 12) {
      throw new Error('BOOTSTRAP_ADMIN_ID and a 12+ character BOOTSTRAP_ADMIN_PASSWORD are required.');
    }
    db.prepare(`
      INSERT INTO users (cedula, name, password_hash, role, created_at)
      VALUES (?, ?, ?, 'admin', ?)
      ON CONFLICT(cedula) DO UPDATE SET
        name = excluded.name,
        password_hash = excluded.password_hash,
        role = 'admin'
    `).run(cedula, process.env.BOOTSTRAP_ADMIN_NAME || 'Administrador', bcrypt.hashSync(bootstrapPassword, 12), new Date().toISOString());
  }

  return db;
}

module.exports = { openDatabase, zoneSeed };
