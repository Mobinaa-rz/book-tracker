/**
 * Data access for the `users` table.
 * Only these functions talk to the table directly.
 * NOTE: `password_hash` is only returned by findByEmailWithPassword (login).
 */

// Columns that are safe to send to the client. Never includes password_hash.
const PUBLIC_COLUMNS = 'id, username, email, created_at';

export function createUserModel(db) {
  const insert = db.prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
  );
  const selectById = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`);
  const selectByEmail = db.prepare(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = ?`,
  );
  const selectByUsername = db.prepare('SELECT id FROM users WHERE username = ?');

  return {
    create({ username, email, passwordHash }) {
      const info = insert.run(username, email, passwordHash);
      return selectById.get(info.lastInsertRowid);
    },

    findById(id) {
      return selectById.get(id) ?? null;
    },

    findByEmailWithPassword(email) {
      return selectByEmail.get(email) ?? null;
    },

    emailExists(email) {
      return !!selectByEmail.get(email);
    },

    usernameExists(username) {
      return !!selectByUsername.get(username);
    },
  };
}
