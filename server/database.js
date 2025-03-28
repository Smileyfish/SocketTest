import sqlite3 from "sqlite3";
import { open } from "sqlite";

export async function setupDatabase() {
  const db = await open({
    filename: "server/chat.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      recipient_id TEXT, -- Nullable for all chat messages
      message_type TEXT NOT NULL, -- 'allchat' or 'private'
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `);

  return db;
}
