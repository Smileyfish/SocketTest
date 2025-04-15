const token = localStorage.getItem("token");

if (!token) {
  window.location.replace("/login");
} else {
  const socket = io("http://localhost:3000", {
    auth: {
      token: token,
    },
    transports: ["websocket"],
  });

  const form = document.getElementById("form");
  const messages = document.getElementById("messages");
  const input = document.getElementById("input");
  const recipientSelect = document.getElementById("recipient-select");
  const chatList = document.getElementById("chat-list");

  socket.on("connect", () => {
    console.log("Connected to server with ID:", socket.id);
  });

  // This event will be emitted by the server with the user info
  socket.on("authenticated", (user) => {
    console.log("Authenticated user:", user.username);
    socket.user = user; // Store it globally on the client side

    socket.emit("get chat previews");
  });

  // Fetch online users
  socket.on("update users", (users) => {
    recipientSelect.innerHTML =
      '<option value="" disabled selected>New Chat</option>'; // Clear existing options
    console.log("Online users:", users);
    users.forEach((username) => {
      if (username !== socket.user.username) {
        const option = document.createElement("option");
        option.value = username;
        option.textContent = username;
        recipientSelect.appendChild(option);
      }
    });
  });

  // Load previous messages from the server
  socket.on("previous messages", (msgs) => {
    messages.innerHTML = ""; // Clear existing messages
    msgs.forEach((msg) => {
      const item = document.createElement("li");
      item.textContent = `${msg.username}: ${msg.content}`;
      messages.appendChild(item);
    });
  });

  // Private history
  socket.on("previous private messages", ({ conversation }) => {
    console.log("Previous private messages:", conversation);
    const privateMessages = document.getElementById("private-messages");
    privateMessages.innerHTML = ""; // Clear
    conversation.forEach((msg) => {
      addPrivateMessage(msg.sender, msg.content);
    });
  });

  socket.on("chat previews", (chats) => {
    chatList.innerHTML = ""; // Clear previous list

    chats.forEach(({ username, lastMessage }) => {
      const li = document.createElement("li");
      li.classList.add("chat-preview");
      li.textContent = `${username}: ${lastMessage.slice(0, 30)}...`;

      li.addEventListener("click", () => {
        openPrivateChat(username);
      });

      chatList.appendChild(li);
    });
  });

  // Send new message
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value) {
      socket.emit("allchat message", {
        username: socket.user.username,
        content: input.value,
      });
      input.value = "";
    }
  });

  // Display new messages
  socket.on("allchat message", (data) => {
    const item = document.createElement("li");
    item.textContent = `${data.username}: ${data.content}`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  });

  socket.on("private message", (data) => {
    console.log(data);
    console.log("Received private message:", data.content);
    addPrivateMessage(data.sender, data.content); // Show received message
  });

  // JavaScript to toggle the sidebar
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");

  let selectedUser = null;
  // Listen for selection change
  recipientSelect.addEventListener("change", (event) => {
    selectedUser = event.target.value;
    if (selectedUser) {
      openPrivateChat(selectedUser);
    }
  });

  function openPrivateChat(username) {
    recipientSelect.style.display = "none";
    chatList.style.display = "none"; // 👈 Hide chat previews

    // Header
    let chatHeader = document.getElementById("chat-header");
    if (!chatHeader) {
      chatHeader = document.createElement("div");
      chatHeader.id = "chat-header";
      chatHeader.classList.add("chat-header");
      sidebar.insertBefore(chatHeader, sidebar.firstChild);
    }

    chatHeader.innerHTML = `
      <h3>Chat with ${username}</h3>
      <button id="close-chat">🔙</button>
    `;

    document.getElementById("close-chat").addEventListener("click", () => {
      closePrivateChat();
    });

    // Chat Box
    let chatBox = document.getElementById("private-chat");
    if (!chatBox) {
      chatBox = document.createElement("div");
      chatBox.id = "private-chat";
      chatBox.classList.add("chat-box");
      sidebar.appendChild(chatBox);
    }

    chatBox.innerHTML = `
      <ul id="private-messages"></ul>
      <form id="private-form">
        <input id="private-input" placeholder="Type a message..." autocomplete="off" />
        <button type="submit">Send</button>
      </form>
    `;

    // Event listener for sending private messages
    const privateForm = document.getElementById("private-form");
    const privateInput = document.getElementById("private-input");
    const privateMessages = document.getElementById("private-messages");

    privateForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const content = privateInput.value.trim();
      if (content) {
        socket.emit("private message", {
          recipient: username,
          content,
        });
        addPrivateMessage(socket.user.username, content); // Show sent message
        privateInput.value = "";
      }
    });

    // Optional: Load previous private messages from the server here
    socket.emit("get private messages", {
      recipient: username,
    });

    privateMessages.innerHTML = `<li>Start a conversation with ${username}...</li>`;
  }

  function addPrivateMessage(sender, content) {
    const privateMessages = document.getElementById("private-messages");
    const item = document.createElement("li");
    item.textContent = `${sender}: ${content}`;
    privateMessages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  }

  function closePrivateChat() {
    selectedUser = null;
    recipientSelect.style.display = "block"; // Show select again
    chatList.style.display = "block";
    document.getElementById("chat-header")?.remove(); // Remove chat header
    document.getElementById("private-chat")?.remove(); // Remove chat box
  }

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open"); // Toggle the sidebar visibility
  });
}
