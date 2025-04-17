function showMessage(text, type = "info") {
  const message = document.getElementById("message");
  if (!message) return;

  message.textContent = text;
  message.style.color =
    type === "success" ? "green" : type === "error" ? "red" : "black";
}

function redirect(url, delay = 1000) {
  setTimeout(() => (window.location.href = url), delay);
}

// === Auth Actions ===
async function handleAuth(endpoint, payload, successRedirect = "/") {
  try {
    const response = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    const data = await response.json();
    if (data.success) {
      showMessage(`${endpoint} successful!`, "success");

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      redirect(successRedirect);
    } else {
      showMessage(data.message || data.error || `${endpoint} failed`, "error");
    }
  } catch (err) {
    console.error(`${endpoint} error:`, err);
    showMessage("Something went wrong. Try again later.", "error");
  }
}

function register(event) {
  event.preventDefault();
  const username = document.getElementById("username")?.value;
  const password = document.getElementById("password")?.value;
  handleAuth("register", { username, password }, "/login");
}

function login(event) {
  event.preventDefault();
  const username = document.getElementById("username")?.value;
  const password = document.getElementById("password")?.value;
  handleAuth("login", { username, password }, "/");
}

async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();
    if (data.success) {
      localStorage.removeItem("token");
      document.cookie =
        "connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      alert("Logged out successfully!");
      window.location.href = "/login.html";
    } else {
      alert("Logout failed: " + data.error);
    }
  } catch (error) {
    console.error("Logout error:", error);
    alert("An error occurred while logging out.");
  }
}

async function checkSession() {
  try {
    const response = await fetch("/api/session", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    window.user = data.loggedIn ? data.user : null;
    console.log(
      data.loggedIn
        ? `User is logged in: ${data.user.username}`
        : "User is not logged in"
    );
  } catch (err) {
    console.error("Failed to check session:", err);
    window.user = null;
  }
}

// === Event Binding ===
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document.getElementById("login-btn")?.addEventListener("click", login);
  document.getElementById("register-btn")?.addEventListener("click", register);

  checkSession();
});
