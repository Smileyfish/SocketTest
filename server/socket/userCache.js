const userIdCache = {};

export async function initializeUserCache(db) {
  const users = await db.all("SELECT id, username FROM users");
  users.forEach(({ username, id }) => {
    userIdCache[username] = id;
  });
  console.log(
    "✅ User cache initialized:",
    Object.keys(userIdCache).length,
    "users"
  );
}

export function getUserIdFromCache(username) {
  return userIdCache[username] || null;
}
