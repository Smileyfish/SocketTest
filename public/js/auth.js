async function register(event) {
  event.preventDefault();
  const message = document.getElementById("message");
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include", //✅ Include session cookie
  });

  const data = await response.json();
  if (data.success) {
    message.style.color = "green";
    message.textContent = "Registration successful!";
    setTimeout(() => {
      window.location.href = "/login"; // Redirect to login page
    }, 1000);
  } else {
    message.style.color = "red";
    message.textContent = data.message || "Registration failed";
  }
}

async function login(event) {
  event.preventDefault();
  const message = document.getElementById("message");
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include", //✅ Include session cookies
  });

  const data = await response.json();
  if (data.success) {
    localStorage.setItem("token", data.token);
    message.style.color = "green";
    message.textContent = "Login successful!";
    setTimeout(() => {
      window.location.href = "/"; // Redirect to a dashboard or home page
    }, 1000);
  } else {
    message.style.color = "red";
    message.textContent = data.error || "Login failed";
  }
}

async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include", // ✅ Include session cookie
    });

    const data = await response.json();
    if (data.success) {
      localStorage.removeItem("token"); // ✅ Remove JWT Token
      document.cookie =
        "connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; // ✅ Force delete session cookie

      alert("Logged out successfully!");
      window.location.href = "/login.html"; // ✅ Redirect to login page
    } else {
      alert("Logout failed: " + data.error);
    }
  } catch (error) {
    console.error("Logout error:", error);
    alert("An error occurred while logging out.");
  }
}

async function checkSession() {
  const response = await fetch("/api/session", {
    method: "GET",
    credentials: "include", // ✅ Include session cookie
  });

  const data = await response.json();
  if (data.loggedIn) {
    console.log("User is logged in:", data.user);
  } else {
    console.log("User is not logged in");
  }
}

// Check session on page load
checkSession();
