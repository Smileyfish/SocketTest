import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { setupDatabase } from "./database.js";
import { handleSocket } from "./socketHandler.js";

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static(join(__dirname, "../public"))); // Serve static files

const db = await setupDatabase();
handleSocket(io, db);

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
