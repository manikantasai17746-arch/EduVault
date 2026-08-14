// ---------------------------------------------------------------------------
// EduVault data layer
// ---------------------------------------------------------------------------
// This is a lightweight, dependency-free JSON-file "database". It mirrors the
// relational design (Teachers, Students, Materials, Access_Log) described in
// the project report, so swapping this module out for real MySQL/MongoDB
// queries later is a drop-in replacement -- every function below maps to a
// single table operation.
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_PATH = path.join(__dirname, "data", "db.json");

function emptyDB() {
  return { teachers: [], students: [], materials: [], accessLogs: [] };
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    save(emptyDB());
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    return emptyDB();
  }
}

function save(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ---- password hashing (scrypt, built into Node -- no extra dependency) ----
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}

function newId() {
  return crypto.randomUUID();
}

// ------------------------------- Teachers ----------------------------------
function createTeacher({ emp_id, name, department, subjects_handled, email, password }) {
  const db = load();
  if (db.teachers.find((t) => t.emp_id === emp_id)) {
    throw new Error("A teacher with this Employee ID already exists.");
  }
  const teacher = {
    emp_id,
    name,
    department,
    subjects_handled,
    email,
    password_hash: hashPassword(password),
    created_at: new Date().toISOString(),
  };
  db.teachers.push(teacher);
  save(db);
  return sanitizeTeacher(teacher);
}

function findTeacher(emp_id) {
  const db = load();
  return db.teachers.find((t) => t.emp_id === emp_id) || null;
}

function listTeachers() {
  const db = load();
  return db.teachers.map(sanitizeTeacher);
}

function sanitizeTeacher(t) {
  if (!t) return null;
  const { password_hash, ...rest } = t;
  return rest;
}

function authenticateTeacher(emp_id, password) {
  const teacher = findTeacher(emp_id);
  if (!teacher) throw new Error("No teacher found with that Employee ID.");
  if (!verifyPassword(password, teacher.password_hash)) {
    throw new Error("Incorrect password.");
  }
  return sanitizeTeacher(teacher);
}

// Card-based login: the barcode on the ID card encodes the Employee ID
// itself, so recognizing the card is just a lookup -- no password needed,
// since the physical card in hand is treated as proof of identity.
function authenticateTeacherByCard(emp_id) {
  const teacher = findTeacher(emp_id);
  if (!teacher) throw new Error("No teacher account is registered for this ID card yet.");
  return sanitizeTeacher(teacher);
}

// ------------------------------- Students -----------------------------------
function createStudent({ roll_no, name, department, semester, email, password }) {
  const db = load();
  if (db.students.find((s) => s.roll_no === roll_no)) {
    throw new Error("A student with this Roll Number already exists.");
  }
  const student = {
    roll_no,
    name,
    department,
    semester,
    email,
    password_hash: hashPassword(password),
    bookmarked_teachers: [],
    created_at: new Date().toISOString(),
  };
  db.students.push(student);
  save(db);
  return sanitizeStudent(student);
}

function findStudent(roll_no) {
  const db = load();
  return db.students.find((s) => s.roll_no === roll_no) || null;
}

function sanitizeStudent(s) {
  if (!s) return null;
  const { password_hash, ...rest } = s;
  return rest;
}

function authenticateStudent(roll_no, password) {
  const student = findStudent(roll_no);
  if (!student) throw new Error("No student found with that Roll Number.");
  if (!verifyPassword(password, student.password_hash)) {
    throw new Error("Incorrect password.");
  }
  return sanitizeStudent(student);
}

// Card-based login: the barcode encodes the Roll Number itself.
function authenticateStudentByCard(roll_no) {
  const student = findStudent(roll_no);
  if (!student) throw new Error("No student account is registered for this ID card yet.");
  return sanitizeStudent(student);
}

function toggleBookmark(roll_no, emp_id) {
  const db = load();
  const student = db.students.find((s) => s.roll_no === roll_no);
  if (!student) throw new Error("Student not found.");
  const idx = student.bookmarked_teachers.indexOf(emp_id);
  if (idx >= 0) {
    student.bookmarked_teachers.splice(idx, 1);
  } else {
    student.bookmarked_teachers.push(emp_id);
  }
  save(db);
  return student.bookmarked_teachers;
}

// ------------------------------- Materials ----------------------------------
function addMaterial({ emp_id, subject, title, unit, semester, file_url, original_name }) {
  const db = load();
  const teacher = db.teachers.find((t) => t.emp_id === emp_id);
  if (!teacher) throw new Error("Unknown teacher Employee ID.");
  const material = {
    material_id: newId(),
    emp_id,
    subject,
    title,
    unit: unit || "",
    semester: semester || "",
    file_url,
    original_name,
    upload_date: new Date().toISOString(),
  };
  db.materials.push(material);
  save(db);
  return material;
}

function materialsByTeacher(emp_id) {
  const db = load();
  return db.materials
    .filter((m) => m.emp_id === emp_id)
    .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
}

function findMaterial(material_id) {
  const db = load();
  return db.materials.find((m) => m.material_id === material_id) || null;
}

function deleteMaterial(material_id, emp_id) {
  const db = load();
  const idx = db.materials.findIndex((m) => m.material_id === material_id && m.emp_id === emp_id);
  if (idx === -1) throw new Error("Material not found for this teacher.");
  const [removed] = db.materials.splice(idx, 1);
  save(db);
  return removed;
}

// ------------------------------ Access Log -----------------------------------
function logAccess({ roll_no, material_id }) {
  const db = load();
  const log = {
    log_id: newId(),
    roll_no,
    material_id,
    accessed_on: new Date().toISOString(),
  };
  db.accessLogs.push(log);
  save(db);
  return log;
}

function accessCountsForTeacher(emp_id) {
  const db = load();
  const materialIds = new Set(db.materials.filter((m) => m.emp_id === emp_id).map((m) => m.material_id));
  const counts = {};
  db.accessLogs.forEach((log) => {
    if (materialIds.has(log.material_id)) {
      counts[log.material_id] = (counts[log.material_id] || 0) + 1;
    }
  });
  return counts;
}

module.exports = {
  createTeacher,
  findTeacher,
  listTeachers,
  authenticateTeacher,
  authenticateTeacherByCard,
  sanitizeTeacher,
  createStudent,
  findStudent,
  authenticateStudent,
  authenticateStudentByCard,
  sanitizeStudent,
  toggleBookmark,
  addMaterial,
  materialsByTeacher,
  findMaterial,
  deleteMaterial,
  logAccess,
  accessCountsForTeacher,
};
