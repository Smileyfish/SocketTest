import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { setupDatabase } from "../Database/db.js";

const router = express.Router();
const SECRET_KEY = "your_secret_key"; // Move this to an environment variable

// Initialize the database
let db;
setupDatabase().then((database) => {
  db = database;
});

// Register Route
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      username,
      hashedPassword
    );

    res.status(201).send("User registered successfully");
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT") {
      res.status(409).send("Username already exists");
    } else {
      res.status(500).send("Error registering user");
    }
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.get(
      "SELECT * FROM users WHERE username = ?",
      username
    );

    if (!user) {
      return res.status(404).send("User not found");
    }

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      return res.status(401).send("Invalid password");
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).send("Error logging in");
  }
});

export default router;
