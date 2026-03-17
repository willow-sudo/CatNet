const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const app = express();
const db = new sqlite3.Database("./users.db");

app.use(express.json());
app.use(express.static("public"));

/* ---------------- DATABASE ---------------- */

db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'user'
)
`);

// Add role column to existing tables if it doesn't exist
db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.log('Role column already exists or error:', err.message);
  }
});



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
    if (err) {
      console.error(err);
      return;
    }

    if (!user) {
      const hash = await bcrypt.hash(defaultAdmin.password, 10);

      db.run(
        "INSERT INTO users (username,password,role) VALUES (?,?,?)",
        [defaultAdmin.username, hash, defaultAdmin.role],
        (err) => {
          if (err) console.error(err);
          else console.log("Default admin created: Nullchan");
        }
      );
    } else {
      // Force admin role if user already exists
      db.run(
        "UPDATE users SET role='admin' WHERE username=?",
        [defaultAdmin.username],
        (err) => {
          if (err) console.error(err);
        }
      );
    }
  }
);

/* ---------------- SIGNUP ---------------- */

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, error: "Missing fields" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (username,password) VALUES (?,?)",
      [username, hash],
      (err) => {
        if (err) {
          return res.json({ success: false, error: "User exists" });
        }

        res.json({ success: true });
      }
    );
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

/* ---------------- LOGIN ---------------- */

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username=?",
    [username],
    async (err, user) => {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }

      if (!user) {
        return res.json({ success: false, error: "User not found" });
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.json({ success: false, error: "Wrong password" });
      }

      // send username + role to frontend
      res.json({
        success: true,
        username: user.username,
        role: user.role,
      });
    }
  );
});

/* ---------------- CREATE POST ---------------- */

app.post("/create-post", (req, res) => {
  const { title, content, author, image } = req.body;

  db.run(
    "INSERT INTO posts (title, content, author, image) VALUES (?,?,?,?)",
    [title, content, author, image],
    function (err) {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }

      res.json({ success: true });
    },
  );
});

/* ---------------- GET POSTS ---------------- */

app.get("/posts", (req, res) => {
  db.all("SELECT * FROM posts ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.json({ success: false });
    }

    res.json({
      success: true,
      posts: rows,
    });
  });
});

/* ---------------- DELETE POST ---------------- */

app.delete("/delete-post/:id", (req, res) => {
  const id = req.params.id;
  const { username } = req.body;

  if (!username) {
    return res.json({ success: false });
  }

  db.get("SELECT role FROM users WHERE username=?", [username], (err, user) => {
    if (err || !user) {
      return res.json({ success: false });
    }

    db.get("SELECT author FROM posts WHERE id=?", [id], (err, post) => {
      if (err || !post) {
        return res.json({ success: false });
      }

      // allow admin OR author
      if (user.role !== "admin" && post.author !== username) {
        return res.json({ success: false, error: "Not authorized" });
      }

      db.run("DELETE FROM posts WHERE id=?", [id], function (err) {
        if (err) {
          console.error(err);
          return res.json({ success: false });
        }

        res.json({ success: true });
      });
    });
  });
});



/* ---------------- DATABASE ---------------- */

db.run(`
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  content TEXT,
  author TEXT
)
`);

db.run(`ALTER TABLE posts ADD COLUMN image TEXT`, (err) => {
  if (err && !err.message.includes("duplicate column name")) {
    console.log(err.message);
  }
});

/* ---------------- START SERVER ---------------- */

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});