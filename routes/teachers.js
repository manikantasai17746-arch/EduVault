const express = require("express");
const router = express.Router();
const db = require("../db");

// Register a new teacher
router.post("/register", (req, res) => {
  try {
    const { emp_id, name, department, subjects_handled, email, password } = req.body;
    if (!emp_id || !name || !department || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }
    const teacher = db.createTeacher({ emp_id, name, department, subjects_handled, email, password });
    res.status(201).json({ teacher });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post("/login", (req, res) => {
  try {
    const { emp_id, password } = req.body;
    if (!emp_id || !password) {
      return res.status(400).json({ error: "Employee ID and password are required." });
    }
    const teacher = db.authenticateTeacher(emp_id, password);
    res.json({ teacher });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Login by scanning an ID card. The barcode on the card encodes the
// Employee ID itself, so this is a direct lookup -- no password needed.
// If the ID isn't registered yet, the frontend routes to registration with
// the scanned Employee ID pre-filled, so the same card works automatically
// from then on.
router.post("/card-login", (req, res) => {
  const { emp_id } = req.body;
  if (!emp_id) return res.status(400).json({ error: "No Employee ID was scanned." });
  try {
    const teacher = db.authenticateTeacherByCard(emp_id.trim());
    res.json({ teacher });
  } catch (err) {
    res.status(404).json({ error: err.message, new_card: true, emp_id: emp_id.trim() });
  }
});

// List all teachers (used by the student search-by-name typeahead)
router.get("/", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  let teachers = db.listTeachers();
  if (q) {
    teachers = teachers.filter(
      (t) => t.emp_id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  }
  res.json({ teachers });
});

// Single teacher lookup by Employee ID
router.get("/:emp_id", (req, res) => {
  const teacher = db.sanitizeTeacher(db.findTeacher(req.params.emp_id));
  if (!teacher) return res.status(404).json({ error: "Teacher not found." });
  res.json({ teacher });
});

// Analytics: access counts per material for this teacher
router.get("/:emp_id/analytics", (req, res) => {
  const teacher = db.findTeacher(req.params.emp_id);
  if (!teacher) return res.status(404).json({ error: "Teacher not found." });
  const materials = db.materialsByTeacher(req.params.emp_id);
  const counts = db.accessCountsForTeacher(req.params.emp_id);
  const data = materials.map((m) => ({ ...m, access_count: counts[m.material_id] || 0 }));
  res.json({ materials: data });
});

module.exports = router;
