const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");
const pgSession = require("connect-pg-simple")(session);
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

if (!process.env.DATABASE_URL) {
  console.error("â‌Œ DATABASE_URL ط؛ظٹط± ظ…ظˆط¬ظˆط¯. ط§ط±ط¨ط· ظ‚ط§ط¹ط¯ط© PostgreSQL ط£ظˆظ„ظ‹ط§.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

function newId(prefix) {
  return prefix + "_" + crypto.randomBytes(10).toString("hex");
}

async function makeLicense() {
  for (;;) {
    const n = crypto.randomInt(0, 100000000).toString().padStart(8, "0");
    const license = `EK-${n.slice(0, 4)}-${n.slice(4)}`;
    const { rowCount } = await pool.query(
      "SELECT 1 FROM teachers WHERE license = $1 LIMIT 1",
      [license]
    );
    if (!rowCount) return license;
  }
}

function teacherExpired(t) {
  if (!t.expires_at) return false;
  const end = new Date(`${t.expires_at}T23:59:59`);
  return Date.now() > end.getTime();
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      license TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      expires_at DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_exams_teacher_id
    ON exams(teacher_id);
  `);
}

app.disable("x-powered-by");
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: false }));

app.set("trust proxy", 1);

app.use(session({
  store: new pgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true
  }),
  name: "ekhtibari.sid",
  secret: process.env.SESSION_SECRET || "CHANGE-THIS-SESSION-SECRET-BEFORE-PRODUCTION",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 12
  }
}));

async function requireTeacher(req, res, next) {
  try {
    if (req.session.role !== "teacher" || !req.session.teacherId) {
      return res.status(401).json({ error: "ظٹط¬ط¨ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„." });
    }

    const { rows } = await pool.query(
      `SELECT id, name, license, active,
              expires_at::text AS expires_at
       FROM teachers
       WHERE id = $1
       LIMIT 1`,
      [req.session.teacherId]
    );

    const teacher = rows[0];

    if (!teacher || !teacher.active || teacherExpired(teacher)) {
      req.session.destroy(() => {});
      return res.status(403).json({ error: "ط§ظ„ط­ط³ط§ط¨ ظ…ظˆظ‚ظˆظپ ط£ظˆ ظ…ظ†طھظ‡ظٹ." });
    }

    req.teacher = teacher;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ط®ط·ط£ ظپظٹ ط§ظ„ط®ط§ط¯ظ…." });
  }
}

function requireAdmin(req, res, next) {
  if (req.session.role !== "admin") {
    return res.status(401).json({ error: "ط¯ط®ظˆظ„ ط§ظ„ط¥ط¯ط§ط±ط© ظ…ط·ظ„ظˆط¨." });
  }
  next();
}

async function teacherPage(req, res, next) {
  try {
    if (req.session.role !== "teacher" || !req.session.teacherId) {
      return res.redirect("/");
    }

    const { rows } = await pool.query(
      `SELECT id, active, expires_at::text AS expires_at
       FROM teachers WHERE id = $1 LIMIT 1`,
      [req.session.teacherId]
    );

    const teacher = rows[0];

    if (!teacher || !teacher.active || teacherExpired(teacher)) {
      return req.session.destroy(() => res.redirect("/"));
    }

    next();
  } catch (err) {
    next(err);
  }
}

function adminPage(req, res, next) {
  if (req.session.role !== "admin") {
    return res.redirect("/admin-login");
  }
  next();
}

/* =========================
   طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„
========================= */

app.post("/api/auth/teacher-login", async (req, res) => {
  try {
    const license = String(req.body.license || "").trim().toUpperCase();
    const password = String(req.body.password || "");

    const { rows } = await pool.query(
      `SELECT id, name, license, password_hash, active,
              expires_at::text AS expires_at
       FROM teachers
       WHERE UPPER(license) = $1
       LIMIT 1`,
      [license]
    );

    const teacher = rows[0];

    if (!teacher || !(await bcrypt.compare(password, teacher.password_hash))) {
      return res.status(401).json({
        error: "ط±ظ‚ظ… ط§ظ„طھط±ط®ظٹطµ ط£ظˆ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± طµط­ظٹط­ط©."
      });
    }

    if (!teacher.active) {
      return res.status(403).json({ error: "ظ‡ط°ط§ ط§ظ„طھط±ط®ظٹطµ ظ…ظˆظ‚ظˆظپ." });
    }

    if (teacherExpired(teacher)) {
      return res.status(403).json({ error: "ط§ظ†طھظ‡طھ ظ…ط¯ط© ظ‡ط°ط§ ط§ظ„طھط±ط®ظٹطµ." });
    }

    req.session.regenerate(err => {
      if (err) {
        return res.status(500).json({ error: "طھط¹ط°ط± ط¨ط¯ط، ط§ظ„ط¬ظ„ط³ط©." });
      }

      req.session.role = "teacher";
      req.session.teacherId = teacher.id;
      res.json({ ok: true });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ط®ط·ط£ ظپظٹ ط§ظ„ط®ط§ط¯ظ…." });
  }
});

app.post("/api/auth/admin-login", (req, res) => {
  const username = String(req.body.username || "");
  const password = String(req.body.password || "");

  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: "ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¥ط¯ط§ط±ط© ط؛ظٹط± طµط­ظٹط­ط©." });
  }

  req.session.regenerate(err => {
    if (err) {
      return res.status(500).json({ error: "طھط¹ط°ط± ط¨ط¯ط، ط§ظ„ط¬ظ„ط³ط©." });
    }

    req.session.role = "admin";
    res.json({ ok: true });
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

/* =========================
   ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¹ظ„ظ…
========================= */

app.get("/api/me", requireTeacher, (req, res) => {
  res.json({
    teacher: {
      id: req.teacher.id,
      name: req.teacher.name,
      license: req.teacher.license,
      expiresAt: req.teacher.expires_at || null
    }
  });
});

/* =========================
   ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ظ…ط¹ظ„ظ…
   ط§ظ„ط¹ط²ظ„ ظٹطھظ… ط¯ط§ط¦ظ…ظ‹ط§ ط¨ظ€ teacher_id
   ط§ظ„ظ…ط£ط®ظˆط° ظ…ظ† ط¬ظ„ط³ط© ط§ظ„ط¯ط®ظˆظ„
========================= */

app.get("/api/exams", requireTeacher, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM exams
       WHERE teacher_id = $1
       ORDER BY updated_at DESC`,
      [req.teacher.id]
    );

    res.json({ exams: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "طھط¹ط°ط± طھط­ظ…ظٹظ„ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ." });
  }
});

app.post("/api/exams", requireTeacher, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "ط§ط³ظ… ط§ظ„ط§ط®طھط¨ط§ط± ظ…ط·ظ„ظˆط¨." });
    }

    const id = newId("exam");
    const data = req.body.data || {};

    const { rows } = await pool.query(
      `INSERT INTO exams (id, teacher_id, name, data)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, name,
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [id, req.teacher.id, name, JSON.stringify(data)]
    );

    res.json({ exam: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "طھط¹ط°ط± ط­ظپط¸ ط§ظ„ط§ط®طھط¨ط§ط±." });
  }
});

app.get("/api/exams/:id", requireTeacher, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, data,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM exams
       WHERE id = $1 AND teacher_id = $2
       LIMIT 1`,
      [req.params.id, req.teacher.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "ط§ظ„ط§ط®طھط¨ط§ط± ط؛ظٹط± ظ…ظˆط¬ظˆط¯." });
    }

    res.json({ exam: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "طھط¹ط°ط± ظپطھط­ ط§ظ„ط§ط®طھط¨ط§ط±." });
  }
});

app.put("/api/exams/:id", requireTeacher, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "ط§ط³ظ… ط§ظ„ط§ط®طھط¨ط§ط± ظ…ط·ظ„ظˆط¨." });
    }

    const data = req.body.data || {};

    const { rows } = await pool.query(
      `UPDATE exams
       SET name = $1,
           data = $2::jsonb,
           updated_at = NOW()
       WHERE id = $3 AND teacher_id = $4
       RETURNING id, name, data,
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [name, JSON.stringify(data), req.params.id, req.teacher.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "ط§ظ„ط§ط®طھط¨ط§ط± ط؛ظٹط± ظ…ظˆط¬ظˆط¯." });
    }

    res.json({ exam: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "طھط¹ط°ط± طھط­ط¯ظٹط« ط§ظ„ط§ط®طھط¨ط§ط±." });
  }
});

app.delete("/api/exams/:id", requireTeacher, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM exams
       WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, req.teacher.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "ط§ظ„ط§ط®طھط¨ط§ط± ط؛ظٹط± ظ…ظˆط¬ظˆط¯." });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "طھط¹ط°ط± ط­ط°ظپ ط§ظ„ط§ط®طھط¨ط§ط±." });
  }
});

/* =========================
   ظ„ظˆط­ط© ط§ظ„ط¥ط¯ط§ط±ط©
========================= */

app.get("/api/admin/teachers", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.license,
        t.active,
        t.expires_at::text AS "expiresAt",
        t.created_at AS "createdAt",
        COUNT(e.id)::int AS "examCount"
      FROM teachers t
      LEFT JOIN exams e ON e.teacher_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);

    res.json({ teachers: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "طھط¹ط°ط± طھط­ظ…ظٹظ„ ط§ظ„ظ…ط¹ظ„ظ…ظٹظ†." });
  }
});

app.post("/api/admin/teachers", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const password = String(req.body.password || "");
    const expiresAt = req.body.expiresAt || null;

    if (!name) {
      return res.status(400).json({ error: "ط§ط³ظ… ط§ظ„ظ…ط¹ظ„ظ… ظ…ط·ظ„ظˆط¨." });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† 6 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„."
      });
    }

    const license = await makeLicense();
    const id = newId("teacher");
    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `INSERT INTO teachers
       (id, name, license, password_hash, active, expires_at)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       RETURNING id, name, license, active,
                 expires_at::text AS "expiresAt"`,
      [id, name, license, passwordHash, expiresAt]
    );

    res.json({ teacher: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "طھط¹ط°ط± ط¥ظ†ط´ط§ط، ط§ظ„ظ…ط¹ظ„ظ…." });
  }
});

app.patch("/api/admin/teachers/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, active, expires_at::text AS expires_at
       FROM teachers
       WHERE id = $1
       LIMIT 1`,
      [req.params.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "ط§ظ„ظ…ط¹ظ„ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯." });
    }

    if (typeof req.body.active === "boolean") {
      await pool.query(
        `UPDATE teachers SET active = $1 WHERE id = $2`,
        [req.body.active, req.params.id]
      );
    }

    if ("expiresAt" in req.body) {
      await pool.query(
        `UPDATE teachers SET expires_at = $1 WHERE id = $2`,
        [req.body.expiresAt || null, req.params.id]
      );
    }

    if (req.body.password) {
      const password = String(req.body.password);
      if (password.length < 6) {
        return res.status(400).json({
          error: "ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† 6 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„."
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await pool.query(
        `UPDATE teachers
         SET password_hash = $1
         WHERE id = $2`,
        [passwordHash, req.params.id]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "طھط¹ط°ط± طھط­ط¯ظٹط« ط§ظ„ظ…ط¹ظ„ظ…." });
  }
});

/* =========================
   ط§ظ„طµظپط­ط§طھ
========================= */

app.delete("/api/admin/teachers/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, active
       FROM teachers
       WHERE id = $1
       LIMIT 1`,
      [req.params.id]
    );

    const teacher = rows[0];

    if (!teacher) {
      return res.status(404).json({
        error: "\u0627\u0644\u0645\u0639\u0644\u0645 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f."
      });
    }

    if (teacher.active) {
      return res.status(409).json({
        error: "\u064a\u062c\u0628 \u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u0645\u0639\u0644\u0645 \u0623\u0648\u0644\u064b\u0627 \u0642\u0628\u0644 \u0627\u0644\u062d\u0630\u0641."
      });
    }

    await pool.query(
      `DELETE FROM teachers WHERE id = $1`,
      [req.params.id]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "\u062a\u0639\u0630\u0631 \u062d\u0630\u0641 \u0627\u0644\u0645\u0639\u0644\u0645."
    });
  }
});

app.get("/teacher", teacherPage, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "teacher.html"));
});

app.get("/admin", adminPage, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

app.get("/admin-login", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin-login.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use(express.static(PUBLIC_DIR, { index: false }));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log("==========================================");
      console.log("âœ… ط§ط®طھط¨ط§ط±ظٹ - ط§ظ„ظ†ط³ط®ط© ط§ظ„ط£ظˆظ†ظ„ط§ظٹظ† طھط¹ظ…ظ„");
      console.log(`ًںŒگ PORT: ${PORT}`);
      console.log("ًں—„ï¸ڈ PostgreSQL ظ…طھطµظ„");
      console.log("==========================================");
    });
  })
  .catch(err => {
    console.error("â‌Œ طھط¹ط°ط± طھظ‡ظٹط¦ط© ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ:", err);
    process.exit(1);
  });
