import express from "express";
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

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, "../public"))); // Serve static files
app.use("/api/auth", authRoutes); // Handle auth routes
app.use(staticRoutes);

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
