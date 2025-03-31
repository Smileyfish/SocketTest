import { Router } from "express";
import { resolve } from "path"; // Use 'resolve' for better path management

const router = Router();

// Serve login page
router.get("/login", (req, res) => {
  res.sendFile(resolve("public/login.html"));
});

// Serve register page
router.get("/register", (req, res) => {
  res.sendFile(resolve("public/register.html"));
});

export default router;
