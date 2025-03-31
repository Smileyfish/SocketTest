export function handleSocket(io, db) {
  io.on("connection", async (socket) => {
    console.log("A user connected:", socket.user.username);

    // Send previous allchat messages to new users
    try {
      const messages = await db.all(
        "SELECT content FROM messages WHERE message_type = 'allchat' ORDER BY timestamp ASC"
      );
      socket.emit(
        "previous messages",
        messages.map((msg) => msg.content)
      );
    } catch (e) {
      console.error("Error fetching messages from DB:", e);
    }

    // Handle allchat messages
    socket.on("allchat message", async (msg) => {
      try {
        await db.run(
          "INSERT INTO messages (content, sender_id, message_type) VALUES (?, ?, 'allchat')",
          msg,
          socket.user.id
        );
        io.emit("allchat message", msg);
      } catch (e) {
        console.error("Database error:", e);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.user.username);
    });
  });
}
