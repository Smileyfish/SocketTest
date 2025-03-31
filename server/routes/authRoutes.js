import express from "express";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/auth.js";
import { setupDatabase } from "../utils/database.js";

const router = express.Router();
const db = await setupDatabase();

// Register user
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      username,
      hashedPassword
    );
    res.json({ success: true });
  } catch (e) {
    res
      .status(400)
      .json({ success: false, message: "Username already exists" });
  }
});

// Login user
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get("SELECT * FROM users WHERE username = ?", username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateToken(user);
  res.json({ success: true, token });
});

export default router;
