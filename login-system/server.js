// server.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const app = express();
const db = new sqlite3.Database("./users.db");

app.use(express.json());
app.use(express.static("public"));

/* ---------------- DATABASE ---------------- */

// Users table
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'user'
)
`);

// Posts table
db.run(`
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  content TEXT,
  author TEXT,
  image TEXT,
  likes INTEGER DEFAULT 0
)
`);

// Comments table
db.run(`
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  username TEXT,
  text TEXT,
  FOREIGN KEY(post_id) REFERENCES posts(id)
)
`);

/* ---------------- DEFAULT ADMIN ---------------- */
const defaultAdmin = {
  username: "Nullchan",
  password: "4@H_7d4''1",
  role: "admin",
};

db.get(
  "SELECT * FROM users WHERE username=?",
  [defaultAdmin.username],
  async (err, user) => {
    if (err) return console.error(err);

    if (!user) {
      const hash = await bcrypt.hash(defaultAdmin.password, 10);
      db.run("INSERT INTO users (username,password,role) VALUES (?,?,?)", [
        defaultAdmin.username,
        hash,
        defaultAdmin.role,
      ]);
      console.log("Default admin created");
    } else {
      db.run("UPDATE users SET role='admin' WHERE username=?", [
        defaultAdmin.username,
      ]);
    }
  },
);

/* ---------------- SIGNUP ---------------- */
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false });

  const hash = await bcrypt.hash(password, 10);
  db.run(
    "INSERT INTO users (username,password) VALUES (?,?)",
    [username, hash],
    (err) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    },
  );
});

/* ---------------- LOGIN ---------------- */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username=?",
    [username],
    async (err, user) => {
      if (err || !user) return res.json({ success: false });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.json({ success: false });

      res.json({ success: true, username: user.username, role: user.role });
    },
  );
});

/* ---------------- CREATE POST ---------------- */
app.post("/create-post", (req, res) => {
  const { title, content, author, image } = req.body;
  if (!title || !content || !author) return res.json({ success: false });

  db.run(
    "INSERT INTO posts (title, content, author, image) VALUES (?,?,?,?)",
    [title, content, author, image || null],
    (err) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    },
  );
});

/* ---------------- LIKE POST ---------------- */
app.post("/like-post/:id", (req, res) => {
  const id = req.params.id;

  db.run(
    "UPDATE posts SET likes = COALESCE(likes,0) + 1 WHERE id = ?",
    [id],
    function (err) {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    },
  );
});

/* ---------------- GET POSTS ---------------- */
app.get("/posts", (req, res) => {
  db.all("SELECT * FROM posts ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.json({ success: false });
    res.json({ success: true, posts: rows });
  });
});

/* ---------------- CREATE COMMENT ---------------- */
app.post("/comment-post/:postId", (req, res) => {
  const postId = req.params.postId;
  const { username, comment } = req.body;
  if (!username || !comment) return res.json({ success: false });

  db.run(
    "INSERT INTO comments (post_id, username, text) VALUES (?,?,?)",
    [postId, username, comment],
    (err) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    },
  );
});

/* ---------------- GET COMMENTS ---------------- */
app.get("/get-comments/:postId", (req, res) => {
  const postId = req.params.postId;
  db.all(
    "SELECT username, text FROM comments WHERE post_id=? ORDER BY id ASC",
    [postId],
    (err, rows) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, comments: rows });
    },
  );
});

/* ---------------- DELETE POST ---------------- */
app.delete("/delete-post/:id", (req, res) => {
  const id = req.params.id;
  const { username } = req.body;

  db.get("SELECT role FROM users WHERE username=?", [username], (err, user) => {
    if (err || !user) return res.json({ success: false });

    db.get("SELECT author FROM posts WHERE id=?", [id], (err, post) => {
      if (err || !post) return res.json({ success: false });

      if (user.role !== "admin" && post.author !== username) {
        return res.json({ success: false });
      }

      db.run("DELETE FROM posts WHERE id=?", [id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
      });
    });
  });
});

/* ---------------- START SERVER ---------------- */
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
