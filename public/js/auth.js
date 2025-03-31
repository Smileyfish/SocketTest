async function register(event) {
  event.preventDefault();
  const message = document.getElementById("message");
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
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

