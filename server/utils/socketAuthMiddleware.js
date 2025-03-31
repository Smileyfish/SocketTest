import { verifyToken } from "./auth.js"; // Assuming you have verifyToken function in utils/auth.js

export async function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth.token; // Get the token from the handshake auth object

  if (!token) {
    return next(new Error("Authentication error")); // Deny connection if no token is provided
  }

  try {
    const user = await verifyToken(token); // Verify the token
    socket.user = user; // Attach the user to the socket object
    next(); // Allow the connection
  } catch (err) {
    console.error("Authentication error:", err); // Log the error if verification fails
    return next(new Error("Authentication error")); // Reject the connection if token is invalid
  }
}
