import express from "express";
import session from "express-session";
import SQLiteStore from "connect-sqlite3";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import { setupDatabase } from "./utils/database.js";
import { handleSocket } from "./socketHandler.js";
import { socketAuthMiddleware } from "./utils/socketAuthMiddleware.js";
import staticRoutes from "./routes/staticRoutes.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const __dirname = dirname(fileURLToPath(import.meta.url));

const SQLiteStoreInstance = SQLiteStore(session); // Initialize SQLiteStore

const SECRET_KEY = "your_secret_key";

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());

// ✅ Session setup
app.use(
  session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStoreInstance({
      db: "sessions.sqlite",
      dir: "server/database",
    }),
    cookie: {
      httpOnly: true, // Protects against XSS attack
      sameSite: "lax", // was true but changed to lax for chrome compatibility
      secure: false, // Set to `true` if using HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
    },
  })
);
app.use(express.static(join(__dirname, "../public"))); // Serve static files
app.use("/api/auth", authRoutes); // Handle auth routes
app.use(staticRoutes);

// ✅ Session validation route
app.get("/api/session", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Async function to start the server
async function startServer() {
  try {
    const db = await setupDatabase();

    // Use the imported socketAuthMiddleware for authentication
    io.use(socketAuthMiddleware);

    // Initialize socket events
    handleSocket(io, db);

    // Start the server
    server.listen(3000, () => {
      console.log("Server running at http://localhost:3000");
    });
  } catch (err) {
    console.error("Failed to start the server:", err);
  }
}

// Start the server
startServer();
