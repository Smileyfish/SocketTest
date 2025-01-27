import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { availableParallelism } from "node:os";
import cluster from "node:cluster";
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";
import { setupDatabase } from "./database/db.js";
import userRoutes from "./routes/userRoutes.js";
import { authenticateJWT } from "./middlewares/authMiddleware.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

if (cluster.isPrimary) {
  const numCPUs = availableParallelism();
  // create one worker per available core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i,
    });
  }

  // set up the adapter on the primary thread
  setupPrimary();
} else {
  const db = await setupDatabase();

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {},
    adapter: createAdapter(),
  });

  const __dirname = dirname(fileURLToPath(import.meta.url));

  app.use(express.json());

  app.use("/api/users", userRoutes);

  app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "index.html"));
  });

  // Route to serve the registration page
  app.get("/register", (req, res) => {
    res.sendFile(join(__dirname, "views/register.html"));
  });

  // Route to serve the login page
  app.get("/login", (req, res) => {
    res.sendFile(join(__dirname, "views/login.html"));
  });

  app.get("/protected", authenticateJWT, (req, res) => {
    res.send("<h1>This is a protected route</h1>");
  });

  //Protect the chat routes
  app.use(authenticateJWT);

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return next(new Error("Authentication error"));
      socket.user = user;
      next();
    });
  });

  io.on("connection", async (socket) => {
    console.log("a user connected");

    socket.on("chat message", async (msg, clientOffset, callback) => {
      let result;
      try {
        // store the message in the database
        result = await db.run(
          "INSERT INTO messages (content, client_offset) VALUES (?,?)",
          msg,
          clientOffset
        );
      } catch (e) {
        if (e.errno === 19) {
          callback();
        } else {
        }
        return;
      }
      // include the offset with the message
      io.emit("chat message", msg, result.lastID);
      console.log("message: " + msg);
      callback();
    });

    if (!socket.recovered) {
      // if the connection state recovery was not successful
      try {
        await db.each(
          "SELECT id, content FROM messages WHERE id > ?",
          [socket.handshake.auth.serverOffset || 0],
          (_err, row) => {
            socket.emit("chat message", row.content, row.id);
          }
        );
      } catch (e) {
        // something went wrong
      }
    }
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });

  const port = process.env.PORT;

  server.listen(port, () => {
    const host = process.env.RENDER_EXTERNAL_URL || "localhost";
    const protocol = process.env.RENDER_EXTERNAL_URL ? "https" : "http";
    console.log(`server running at ${protocol}://${host}:${port}`);
  });
}
