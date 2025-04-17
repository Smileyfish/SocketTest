export async function sendChatPreviews(socket, db) {
    try {
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
  
      const previews = [];
      const seen = new Set();
  
      for (const { username, content } of messages) {
        if (!seen.has(username)) {
          seen.add(username);
          previews.push({ username, lastMessage: content });
        }
      }
  
      socket.emit("chat previews", previews);
    } catch (e) {
      console.error("❌ Error sending chat previews:", e);
    }
  }
  
  export async function fetchAllChatMessages(db) {
    return db.all(
      `SELECT messages.content, users.username 
       FROM messages 
       JOIN users ON messages.sender_id = users.id
       WHERE messages.message_type = 'allchat' 
       ORDER BY messages.timestamp ASC`
    );
  }
  
  export async function fetchAllUsers(db, currentUserId) {
    const users = await db.all("SELECT username FROM users WHERE id != ?", currentUserId);
    return users.map((u) => u.username);
  }
  
  export async function fetchPrivateMessages(db, senderId, recipientUsername) {
    const recipient = await db.get("SELECT id FROM users WHERE username = ?", recipientUsername);
    if (!recipient) throw new Error("Recipient user not found");
  
    return db.all(
      `SELECT m.content, m.sender_id, u.username AS sender
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.message_type = 'private'
       AND ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
       ORDER BY m.timestamp ASC`,
      senderId,
      recipient.id,
      recipient.id,
      senderId
    );
  }
  