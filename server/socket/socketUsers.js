// In-memory user map (username → { socketId, userId })
export const users = {};

export function addUser(username, socketId, userId) {
  users[username] = { socketId, userId };
}

export function removeUser(username) {
  delete users[username];
}

export function getRecipientData(username) {
  const data = users[username];
  if (!data) throw new Error(`User '${username}' is offline or not found.`);
  return data;
}
