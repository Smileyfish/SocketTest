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

  // Load previous messages from the server
  socket.on("previous messages", (msgs) => {
    messages.innerHTML = ""; // Clear existing messages
    msgs.forEach((msg) => {
      const item = document.createElement("li");
      item.textContent = `${msg.username}: ${msg.content}`;
      messages.appendChild(item);
    });
  });

  // Send new message
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value) {
      socket.emit("allchat message", input.value);
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

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  }
}
