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
      item.textContent = msg;
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
  socket.on("allchat message", (msg) => {
    const item = document.createElement("li");
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
  });

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  }
  // Attach the logout function to the logout button
  document.getElementById("logout-btn").addEventListener("click", logout);
}
