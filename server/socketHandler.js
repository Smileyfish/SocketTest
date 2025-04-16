// Use a map that holds both socketId and userId
const users = {};

export function handleSocket(io, db) {
  io.on("connection", async (socket) => {
    console.log("A user connected:", socket.user.username);

    // Send user object to client
    if (socket.user) {
      socket.emit("authenticated", socket.user);
      console.log("Authenticated user:", socket.user);
    }

    // Store user object (username mapped to { socketId, userId })
    users[socket.user.username] = {
      socketId: socket.id,
      userId: socket.user.id,
    };

    io.emit("update users", Object.keys(users));

    // Send allchat messages to new users
    try {
      const messages = await db.all(
        `SELECT messages.content, users.username 
         FROM messages 
         JOIN users ON messages.sender_id = users.id
         WHERE messages.message_type = 'allchat' 
         ORDER BY messages.timestamp ASC`
      );
      socket.emit("previous messages", messages);
    } catch (e) {
      console.error("Error fetching messages from DB:", e);
    }

    // Send all existing users to the new user
    try {
      const usersFromDB = await db.all(
        "SELECT username FROM users WHERE id != ?",
        socket.user.id
      );
      const usernames = usersFromDB.map((user) => user.username);
      socket.emit("all users", usernames);
    } catch (e) {
      console.error("Error fetching all users:", e);
    }

    // Handle request for previous private messages
    socket.on("get private messages", async ({ recipient }) => {
      try {
        const senderId = socket.user.id;
        const recipientData = users[recipient];

        if (!recipientData) {
          console.error("Recipient not found or offline:", recipient);
          return;
        }

        const recipientId = recipientData.userId;

        const messages = await db.all(
          `SELECT messages.content, messages.sender_id, u.username AS sender
           FROM messages
           JOIN users u ON messages.sender_id = u.id
           WHERE message_type = 'private'
           AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
           ORDER BY timestamp ASC`,
          senderId,
          recipientId,
          recipientId,
          senderId
        );

        socket.emit("previous private messages", {
          conversation: messages,
        });
      } catch (e) {
        console.error("Error fetching private messages:", e);
      }
    });

    socket.on("get chat previews", async () => {
      try {
        // Get last message for each distinct conversation
        const messages = await db.all(
          `
          SELECT u.username, m.content
          FROM messages m
          JOIN users u ON 
            (u.id = m.sender_id AND m.recipient_id = ?)
            OR (u.id = m.recipient_id AND m.sender_id = ?)
          WHERE m.message_type = 'private'
          ORDER BY m.timestamp DESC
        `,
          socket.user.id,
          socket.user.id
        );

        const previewsMap = {};

        for (const msg of messages) {
          if (!previewsMap[msg.username]) {
            previewsMap[msg.username] = msg.content;
          }
        }

        const previews = Object.entries(previewsMap).map(
          ([username, lastMessage]) => ({
            username,
            lastMessage,
          })
        );
        console.log("Chat previews:", previews);
        socket.emit("chat previews", previews);
      } catch (e) {
        console.error("Error getting chat previews:", e);
      }
    });

    // Handle allchat messages
    socket.on("allchat message", async (data) => {
      try {
        const { username, content } = data;

        await db.run(
          "INSERT INTO messages (content, sender_id, message_type) VALUES (?, ?, 'allchat')",
          content,
          socket.user.id
        );

        io.emit("allchat message", { username: socket.user.username, content });
      } catch (e) {
        console.error("Database error:", e);
      }
    });

    // Handle private messages using in-memory map
    socket.on("private message", async ({ recipient, content }) => {
      const recipientData = users[recipient];

      if (!recipientData) {
        console.error("User not found or offline:", recipient);
        return;
      }

      const recipientId = recipientData.userId;
      const recipientSocketId = recipientData.socketId;

      try {
        await db.run(
          "INSERT INTO messages (content, sender_id, recipient_id, message_type) VALUES (?, ?, ?, 'private')",
          content,
          socket.user.id,
          recipientId
        );

        io.to(recipientSocketId).emit("private message", {
          sender: socket.user.username,
          content,
        });
      } catch (e) {
        console.error("Error handling private message:", e);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.user.username);
      delete users[socket.user.username];
      io.emit("update users", Object.keys(users)); // Update client list
    });
  });
}
