import { users, addUser, removeUser, getRecipientData } from "./socketUsers.js";
import {
  sendChatPreviews,
  fetchAllUsers,
  fetchAllChatMessages,
  fetchPrivateMessages,
} from "./socketUtils.js";

export function handleSocket(io, db) {
  io.on("connection", async (socket) => {
    const { user } = socket;
    if (!user) return;

    console.log(`✅ User connected: ${user.username}`);
    socket.emit("authenticated", user);
    await sendChatPreviews(socket, db);

    addUser(user.username, socket.id, user.id);
    io.emit("update users", Object.keys(users));

    try {
      const messages = await fetchAllChatMessages(db);
      socket.emit("previous messages", messages);
    } catch (e) {
      console.error("❌ Error fetching allchat messages:", e);
    }

    try {
      const allUsers = await fetchAllUsers(db, user.id);
      socket.emit("all users", allUsers);
    } catch (e) {
      console.error("❌ Error fetching all users:", e);
    }

    socket.on("get private messages", async ({ recipient }) => {
      try {
        const messages = await fetchPrivateMessages(db, user.id, recipient);
        socket.emit("previous private messages", { conversation: messages });
      } catch (e) {
        console.error("❌ Error fetching private messages:", e);
      }
    });

    socket.on("get chat previews", async () => {
      await sendChatPreviews(socket, db);
    });

    socket.on("allchat message", async ({ content }) => {
      try {
        await db.run(
          "INSERT INTO messages (content, sender_id, message_type) VALUES (?, ?, 'allchat')",
          content,
          user.id
        );
        io.emit("allchat message", { username: user.username, content });
      } catch (e) {
        console.error("❌ Error saving allchat message:", e);
      }
    });

    socket.on("private message", async ({ recipient, content }) => {
      try {
        const { userId: recipientId, socketId } = await getRecipientData(
          recipient
        );

        // Save to DB
        await db.run(
          "INSERT INTO messages (content, sender_id, recipient_id, message_type) VALUES (?, ?, ?, 'private')",
          content,
          user.id,
          recipientId
        );

        // Only emit to recipient if they're online
        if (socketId) {
          io.to(socketId).emit("private message", {
            sender: user.username,
            content,
          });
        }
      } catch (e) {
        console.error("❌ Error sending private message:", e);
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Disconnected: ${user.username}`);
      removeUser(user.username);
      io.emit("update users", Object.keys(users));
    });
  });
}
