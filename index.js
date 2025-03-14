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

const db = await setupDatabase();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
  pingInterval: 5000, // Ping every 5 seconds (default is 25s)
  pingTimeout: 10000, // Ping Timeout 10 seconds (default is 60)
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
  console.log(`a user connected: ${socket.user.username}`);

  // Emit the user information to the client
  socket.emit("user info", socket.user);

  socket.on("chat message", async (msg, clientOffset, callback) => {
    let result;
    try {
      // store the message in the database
      result = await db.run(
        "INSERT INTO messages (content, client_offset, sender_id) VALUES (?,?,?)",
        msg,
        clientOffset,
        socket.user.username
      );
    } catch (e) {
      if (e.errno === 19) {
        callback();
      } else {
      }
      return;
    }
    // include the offset with the message
    io.emit("chat message", msg, result.lastID, socket.user.username);
    console.log(`message from ${socket.user.username}: ${msg}`);
    callback();
  });

  socket.on(
    "private chat message",
    async (message, chatRoomId, clientOffset, callback) => {
      try {
        // Store the message in the database
        const result = await db.run(
          "INSERT INTO chat_messages (chat_room_id, sender_id, content, client_offset) VALUES (?, ?, ?, ?)",
          [chatRoomId, socket.user.username, message, clientOffset]
        );
      } catch (e) {
        if (e.errno === 19) {
          callback();
        } else {
        }
      }
      io.to(`chat_${chatRoomId}`).emit(
        "private chat message",
        message,
        socket.user.username
      );
      console.log(
        `private message from ${socket.user.username}: ${message} to chat room ${chatRoomId}`
      );
      callback();
    }
  );

  socket.on("join private chat", async ({ to }, callback) => {
    const chatRoomId = await getOrCreateChatRoom(db, socket.user.username, to);
    socket.join(`chat_${chatRoomId}`);
    console.log(`user ${socket.user.username} joined chat_${chatRoomId}`);
    socket.emit("join private chat", chatRoomId);
    callback();
  });

  socket.on("fetch private chat messages", async (chatRoomId, callback) => {
    try {
      const messages = await db.all(
        "SELECT * FROM chat_messages WHERE chat_room_id = ?",
        chatRoomId
      );
      socket.emit("fetch private chat messages", messages);
      callback();
    } catch (e) {
      callback();
    }
  });

  if (!socket.recovered) {
    // if the connection state recovery was not successful
    try {
      await db.each(
        "SELECT id, content, sender_id FROM messages WHERE id > ?",
        [socket.handshake.auth.serverOffset || 0],
        (_err, row) => {
          socket.emit("chat message", row.content, row.id, row.sender_id);
          console.log("Recovered message:", row.sender_id, row.content);
        }
      );
    } catch (e) {
      console.error("Error recovering global chat messages:", e);
    }
  }

  socket.on("disconnect", () => {
    console.log(`user disconnected: ${socket.user.username}`);
  });
});

const port = process.env.PORT;

server.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);

async function getOrCreateChatRoom(db, user1, user2) {
  // Ensure user1_id is always smaller than user2_id to avoid duplicate entries
  const [userA, userB] = user1 < user2 ? [user1, user2] : [user2, user1];

  let room = await db.get(
    "SELECT * FROM chat_rooms WHERE user1_id = ? AND user2_id = ?",
    [userA, userB]
  );

  if (!room) {
    const result = await db.run(
      "INSERT INTO chat_rooms (user1_id, user2_id) VALUES (?, ?)",
      [userA, userB]
    );
    room = { id: result.lastID };
  }

  return room.id;
}
