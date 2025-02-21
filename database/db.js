import sqlite3 from "sqlite3";
import { open } from "sqlite";
import bcrypt from "bcryptjs";

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

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER,
      user2_id INTEGER,
      FOREIGN KEY(user1_id) REFERENCES users(id),
      FOREIGN KEY(user2_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT UNIQUE,
      chat_room_id INTEGER,
      sender_id INTEGER,
      content TEXT,
      FOREIGN KEY(chat_room_id) REFERENCES chat_rooms(id),
      FOREIGN KEY(sender_id) REFERENCES users(id)
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
