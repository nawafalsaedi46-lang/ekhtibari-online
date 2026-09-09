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
  console.error("❌ DATABASE_URL غير موجود. اربط قاعدة PostgreSQL أولًا.");
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

  await pool.query("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'معلم'");
  await pool.query("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ");
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
      return res.status(401).json({ error: "يجب تسجيل الدخول." });
    }

    const { rows } = await pool.query(
      `SELECT id, name, license, active, gender,
              expires_at::text AS expires_at
       FROM teachers
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [req.session.teacherId]
    );

    const teacher = rows[0];

    if (!teacher || !teacher.active || teacherExpired(teacher)) {
      req.session.destroy(() => {});
      return res.status(403).json({ error: "الحساب موقوف أو منتهي." });
    }

    req.teacher = teacher;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ في الخادم." });
  }
}

function requireAdmin(req, res, next) {
  if (req.session.role !== "admin") {
    return res.status(401).json({ error: "دخول الإدارة مطلوب." });
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
   تسجيل الدخول
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
         AND deleted_at IS NULL
       LIMIT 1`,
      [license]
    );

    const teacher = rows[0];

    if (!teacher || !(await bcrypt.compare(password, teacher.password_hash))) {
      return res.status(401).json({
        error: "رقم الترخيص أو كلمة المرور غير صحيحة."
      });
    }

    if (!teacher.active) {
      return res.status(403).json({ error: "هذا الترخيص موقوف." });
    }

    if (teacherExpired(teacher)) {
      return res.status(403).json({ error: "انتهت مدة هذا الترخيص." });
    }

    req.session.regenerate(err => {
      if (err) {
        return res.status(500).json({ error: "تعذر بدء الجلسة." });
      }

      req.session.role = "teacher";
      req.session.teacherId = teacher.id;
      res.json({ ok: true });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ في الخادم." });
  }
});

app.post("/api/auth/admin-login", (req, res) => {
  const username = String(req.body.username || "");
  const password = String(req.body.password || "");

  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: "بيانات الإدارة غير صحيحة." });
  }

  req.session.regenerate(err => {
    if (err) {
      return res.status(500).json({ error: "تعذر بدء الجلسة." });
    }

    req.session.role = "admin";
    res.json({ ok: true });
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

/* =========================
   بيانات المعلم
========================= */

app.get("/api/me", requireTeacher, (req, res) => {
  res.json({
    teacher: {
      id: req.teacher.id,
      name: req.teacher.name,
      gender: req.teacher.gender || "معلم",
      license: req.teacher.license,
      active: req.teacher.active,
      expiresAt: req.teacher.expires_at || null
    }
  });
});


app.patch("/api/me", requireTeacher, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const gender = String(req.body.gender || "معلم");

    if (name.length < 2) {
      return res.status(400).json({ error: "اكتب الاسم بشكل صحيح." });
    }

    if (!["معلم","معلمة"].includes(gender)) {
      return res.status(400).json({ error: "الصفة غير صحيحة." });
    }

    const { rows } = await pool.query(
      "UPDATE teachers SET name = $1, gender = $2 WHERE id = $3 RETURNING id, name, gender, license, active, expires_at::text AS \"expiresAt\"",
      [name, gender, req.teacher.id]
    );

    res.json({ teacher: rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "تعذر حفظ بيانات المعلم." });
  }
});

app.patch("/api/me/password", requireTeacher, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "كلمة المرور الجديدة 6 أحرف على الأقل."
      });
    }

    const { rows } = await pool.query(
      "SELECT password_hash FROM teachers WHERE id = $1 LIMIT 1",
      [req.teacher.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "الحساب غير موجود." });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      rows[0].password_hash
    );

    if (!valid) {
      return res.status(400).json({
        error: "كلمة المرور الحالية غير صحيحة."
      });
    }

    const passwordHash = await bcrypt.hash(newPassword,12);

    await pool.query(
      "UPDATE teachers SET password_hash = $1 WHERE id = $2",
      [passwordHash, req.teacher.id]
    );

    res.json({ ok:true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "تعذر تغيير كلمة المرور." });
  }
});

/* =========================
   اختبارات المعلم
   العزل يتم دائمًا بـ teacher_id
   المأخوذ من جلسة الدخول
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
    res.status(500).json({ error: "تعذر تحميل الاختبارات." });
  }
});

app.post("/api/exams", requireTeacher, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "اسم الاختبار مطلوب." });
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
    res.status(500).json({ error: "تعذر حفظ الاختبار." });
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
      return res.status(404).json({ error: "الاختبار غير موجود." });
    }

    res.json({ exam: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "تعذر فتح الاختبار." });
  }
});

app.put("/api/exams/:id", requireTeacher, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "اسم الاختبار مطلوب." });
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
      return res.status(404).json({ error: "الاختبار غير موجود." });
    }

    res.json({ exam: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "تعذر تحديث الاختبار." });
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
      return res.status(404).json({ error: "الاختبار غير موجود." });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "تعذر حذف الاختبار." });
  }
});

/* =========================
   لوحة الإدارة
========================= */

app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {

    const teacherResult = await pool.query(`
      SELECT

        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
        )::int AS "totalTeachers",

        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND active = TRUE
            AND (
              expires_at IS NULL
              OR expires_at >= CURRENT_DATE
            )
        )::int AS "activeTeachers",

        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND active = FALSE
        )::int AS "stoppedTeachers",

        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND expires_at IS NOT NULL
            AND expires_at < CURRENT_DATE
        )::int AS "expiredTeachers",

        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND active = TRUE
            AND expires_at IS NOT NULL
            AND expires_at >= CURRENT_DATE
            AND expires_at <= CURRENT_DATE + 7
        )::int AS "expiringSoon",

        COUNT(*) FILTER (
          WHERE deleted_at IS NOT NULL
        )::int AS "trashTeachers"

      FROM teachers
    `);

    const examResult = await pool.query(`
      SELECT

        COUNT(*) FILTER (
          WHERE t.deleted_at IS NULL
        )::int AS "totalExams",

        COUNT(*) FILTER (
          WHERE t.deleted_at IS NULL
            AND e.created_at >= date_trunc('month', CURRENT_DATE)
        )::int AS "monthExams"

      FROM exams e
      JOIN teachers t
        ON t.id = e.teacher_id
    `);

    res.json({
      stats:{
        ...teacherResult.rows[0],
        ...examResult.rows[0]
      }
    });

  } catch(err){

    console.error(err);

    res.status(500).json({
      error:"تعذر تحميل إحصائيات الإدارة."
    });

  }
});


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
      WHERE t.deleted_at IS NULL
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);

    res.json({ teachers: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "تعذر تحميل المعلمين." });
  }
});

app.get("/api/admin/teachers/trash", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.license,
        t.expires_at::text AS "expiresAt",
        t.deleted_at AS "deletedAt",
        COUNT(e.id)::int AS "examCount"
      FROM teachers t
      LEFT JOIN exams e ON e.teacher_id = t.id
      WHERE t.deleted_at IS NOT NULL
      GROUP BY t.id
      ORDER BY t.deleted_at DESC
    `);

    res.json({ teachers: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "تعذر تحميل المحذوفات." });
  }
});

app.post("/api/admin/teachers", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const password = String(req.body.password || "");
    const expiresAt = req.body.expiresAt || null;

    if (!name) {
      return res.status(400).json({ error: "اسم المعلم مطلوب." });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
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
    res.status(500).json({ error: "تعذر إنشاء المعلم." });
  }
});

app.patch("/api/admin/teachers/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, active, expires_at::text AS expires_at
       FROM teachers
       WHERE id = $1
         AND deleted_at IS NULL
       LIMIT 1`,
      [req.params.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "المعلم غير موجود." });
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
          error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
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
    res.status(500).json({ error: "تعذر تحديث المعلم." });
  }
});

/* =========================
   الصفحات
========================= */


app.delete("/api/admin/teachers/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE teachers
       SET deleted_at = NOW(),
           active = FALSE
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING id, name, license`,
      [req.params.id]
    );

    if(!rows[0]){
      return res.status(404).json({
        error: "المعلم غير موجود أو موجود مسبقًا في المحذوفات."
      });
    }

    res.json({ ok:true, teacher:rows[0] });

  } catch(err){
    console.error(err);
    res.status(500).json({
      error: "تعذر نقل المعلم إلى المحذوفات."
    });
  }
});


app.patch("/api/admin/teachers/:id/restore", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE teachers
       SET deleted_at = NULL,
           active = TRUE
       WHERE id = $1
         AND deleted_at IS NOT NULL
       RETURNING id, name, license, active,
                 expires_at::text AS "expiresAt"`,
      [req.params.id]
    );

    if(!rows[0]){
      return res.status(404).json({
        error: "الحساب غير موجود في المحذوفات."
      });
    }

    res.json({ ok:true, teacher:rows[0] });

  } catch(err){
    console.error(err);
    res.status(500).json({
      error: "تعذر استعادة الحساب."
    });
  }
});


app.delete("/api/admin/teachers/:id/permanent", requireAdmin, async (req, res) => {
  try {
    const confirmLicense =
      String(req.body.confirmLicense || "")
        .trim()
        .toUpperCase();

    const { rows } = await pool.query(
      `SELECT id, name, license
       FROM teachers
       WHERE id = $1
         AND deleted_at IS NOT NULL
       LIMIT 1`,
      [req.params.id]
    );

    const teacher = rows[0];

    if(!teacher){
      return res.status(404).json({
        error: "الحساب غير موجود في المحذوفات."
      });
    }

    if(confirmLicense !== String(teacher.license).toUpperCase()){
      return res.status(400).json({
        error: "رقم الترخيص غير مطابق."
      });
    }

    await pool.query(
      "DELETE FROM teachers WHERE id = $1 AND deleted_at IS NOT NULL",
      [teacher.id]
    );

    res.json({ ok:true });

  } catch(err){
    console.error(err);
    res.status(500).json({
      error: "تعذر الحذف النهائي."
    });
  }
});


app.get("/exams", teacherPage, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "exams.html"));
});

app.get("/settings", teacherPage, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "settings.html"));
});

app.get("/dashboard", teacherPage, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "dashboard.html"));
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
      console.log("✅ اختباري - النسخة الأونلاين تعمل");
      console.log(`🌐 PORT: ${PORT}`);
      console.log("🗄️ PostgreSQL متصل");
      console.log("==========================================");
    });
  })
  .catch(err => {
    console.error("❌ تعذر تهيئة قاعدة البيانات:", err);
    process.exit(1);
  });
