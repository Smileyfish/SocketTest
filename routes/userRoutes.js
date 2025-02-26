import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticateJWT } from "../middlewares/authMiddleware.js";
import { setupDatabase } from "../database/db.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

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
      { username: user.username },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.header("Authorization", `Bearer ${token}`).send({ token });
  } catch (err) {
    res.status(500).send("Error logging in");
  }
});

// Get All Users Route
router.get("/all", authenticateJWT, async (req, res) => {
  try {
    const users = await db.all("SELECT id, username FROM users");
    res.status(200).json(users);
  } catch (err) {
    res.status(500).send("Error retrieving users");
  }
});

export default router;
