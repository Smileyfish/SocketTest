import { getUserIdFromCache } from "./userCache.js";

// In-memory online user map (username → { socketId, userId })
export const users = {};

export function addUser(username, socketId, userId) {
  users[username] = { socketId, userId };
}

export function removeUser(username) {
  delete users[username];
}

export async function getRecipientData(username) {
  const onlineData = users[username];
  if (onlineData) return onlineData;

  const userId = getUserIdFromCache(username);
  if (!userId) throw new Error(`User '${username}' not found in cache.`);
  return { userId, socketId: null };
}
