const express = require("express");
const path = require("path");
const initSqlJs = require("sql.js");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "data.db");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let db;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT DEFAULT '',
      submitted_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_links_url ON links(category, url)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS login_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      action TEXT DEFAULT 'login',
      ip TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  saveDb();
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Get all links for a category
app.get("/api/links/:category", (req, res) => {
  const { category } = req.params;
  const { search } = req.query;

  let query = "SELECT * FROM links WHERE category = ?";
  const params = [category];

  if (search && search.trim()) {
    query +=
      " AND (title LIKE ? OR url LIKE ? OR description LIKE ? OR submitted_by LIKE ?)";
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  query += " ORDER BY created_at DESC";

  const stmt = db.prepare(query);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  res.json(rows);
});

// Add a new link
app.post("/api/links", (req, res) => {
  const { category, title, url, description, submitted_by } = req.body;

  if (!category || !title || !url) {
    return res.status(400).json({ error: "category, title, and url are required" });
  }

    // Validate URL format
  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return res.status(400).json({ error: "Invalid URL format. Please enter a valid URL (e.g. https://example.com)." });
  }

  // Normalize URL: lowercase, remove trailing slash, use https:// as default scheme
  let normalizedUrl = parsedUrl.href.toLowerCase().replace(/\/$/, "");

  // Check for duplicate (normalized comparison)
  const dupStmt = db.prepare("SELECT id FROM links WHERE category = ? AND LOWER(TRIM(url)) = ?");
  dupStmt.bind([category, normalizedUrl]);
  if (dupStmt.step()) {
    dupStmt.free();
    return res.status(409).json({ error: "Duplicate entry! This URL already exists in this category." });
  }
  dupStmt.free();

  const stmt = db.prepare(
    "INSERT INTO links (category, title, url, description, submitted_by) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run([category, title.trim(), normalizedUrl, (description || "").trim(), (submitted_by || "").trim()]);
  stmt.free();
  saveDb();

  const newId = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
  const getStmt = db.prepare("SELECT * FROM links WHERE id = ?");
  getStmt.bind([newId]);
  getStmt.step();
  const newLink = getStmt.getAsObject();
  getStmt.free();

  res.status(201).json(newLink);
});

// Delete a link
app.delete("/api/links/:id", (req, res) => {
  const { id } = req.params;
  const checkStmt = db.prepare("SELECT id FROM links WHERE id = ?");
  checkStmt.bind([id]);
  if (!checkStmt.step()) {
    checkStmt.free();
    return res.status(404).json({ error: "Link not found." });
  }
  checkStmt.free();

  const stmt = db.prepare("DELETE FROM links WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  saveDb();
  res.json({ success: true });
});

// Update a link
app.put("/api/links/:id", (req, res) => {
  const { id } = req.params;
  const { title, url, description, submitted_by } = req.body;

  // Check link exists
  const checkStmt = db.prepare("SELECT id FROM links WHERE id = ?");
  checkStmt.bind([id]);
  if (!checkStmt.step()) {
    checkStmt.free();
    return res.status(404).json({ error: "Link not found." });
  }
  checkStmt.free();

  // Validate URL if provided
  let normalizedUrl = url;
  if (url) {
    try {
      const parsedUrl = new URL(url.trim());
      normalizedUrl = parsedUrl.href;
    } catch {
      return res.status(400).json({ error: "Invalid URL format." });
    }
  }

  const stmt = db.prepare(
    "UPDATE links SET title = ?, url = ?, description = ?, submitted_by = ? WHERE id = ?"
  );
  stmt.run([title, normalizedUrl, description, submitted_by, id]);
  stmt.free();
  saveDb();

  const getStmt = db.prepare("SELECT * FROM links WHERE id = ?");
  getStmt.bind([id]);
  getStmt.step();
  const updated = getStmt.getAsObject();
  getStmt.free();

  res.json(updated);
});

// Export all links as CSV
app.get("/api/export/:category", (req, res) => {
  const { category } = req.params;
  const stmt = db.prepare("SELECT * FROM links WHERE category = ? ORDER BY created_at DESC");
  stmt.bind([category]);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${category}-links.csv"`);
  // BOM for Excel compatibility with UTF-8
  res.write("\uFEFF");
  res.write("ID,Title,URL,Description,Submitted By,Created At\n");
  rows.forEach((r) => {
    res.write(
      `${r.id},"${(r.title || "").replace(/"/g, '""')}","${(r.url || "").replace(/"/g, '""')}","${(r.description || "").replace(/"/g, '""')}","${(r.submitted_by || "").replace(/"/g, '""')}","${r.created_at}"\n`
    );
  });
  res.end();
});

// Log a login event
app.post("/api/login-log", (req, res) => {
  const { name, action } = req.body;
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  const stmt = db.prepare(
    "INSERT INTO login_log (name, action, ip) VALUES (?, ?, ?)"
  );
  stmt.run([name.trim(), action || "login", ip]);
  stmt.free();
  saveDb();
  res.json({ success: true });
});

// Get login logs
app.get("/api/login-log", (req, res) => {
  const stmt = db.prepare("SELECT * FROM login_log ORDER BY created_at DESC LIMIT 100");
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  res.json(rows);
});

// Get login log stats (count per user today)
app.get("/api/login-log/stats", (req, res) => {
  const stmt = db.prepare(`
    SELECT name, COUNT(*) as count, MAX(created_at) as last_login
    FROM login_log
    WHERE created_at >= datetime('now', '-1 day')
    GROUP BY name
    ORDER BY last_login DESC
  `);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  res.json(rows);
});

// Get stats
app.get("/api/stats", (req, res) => {
  const categories = ["accommodation", "yojna", "faculty"];
  const stats = {};
  categories.forEach((cat) => {
    const stmt = db.prepare("SELECT COUNT(*) as count FROM links WHERE category = ?");
    stmt.bind([cat]);
    stmt.step();
    stats[cat] = stmt.getAsObject().count;
    stmt.free();
  });
  res.json(stats);
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Link Tracker running at http://localhost:${PORT}`);
  });
});
