import sqlite3 from "sqlite3";
import { open } from "sqlite";

export async function setupDatabase() {
  const db = await open({
    filename: "database/chat.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT UNIQUE,
      content TEXT
    );
  `);

  return db;
}