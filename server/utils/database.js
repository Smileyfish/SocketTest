import sqlite3 from "sqlite3";
import { open } from "sqlite";
import bcrypt from "bcrypt";

export async function setupDatabase() {
  const db = await open({
    filename: "server/database/chat.db",
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

  // Create users table
  await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
  );
`);

  const hashedPassword = await bcrypt.hash("1234", 10);
  await db.exec(`
    INSERT OR IGNORE INTO users (username, password) VALUES
    ('user1', '${hashedPassword}'),
    ('user2', '${hashedPassword}'),
    ('user3', '${hashedPassword}'),
    ('user4', '${hashedPassword}');
  `);

  return db;
}
