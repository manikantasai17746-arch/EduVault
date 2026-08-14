const express = require("express");
const router = express.Router();
const db = require("../db");

// Register a new student
router.post("/register", (req, res) => {
  try {
    const { roll_no, name, department, semester, email, password } = req.body;
    if (!roll_no || !name || !department || !semester || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }
    const student = db.createStudent({ roll_no, name, department, semester, email, password });
    res.status(201).json({ student });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post("/login", (req, res) => {
  try {
    const { roll_no, password } = req.body;
    if (!roll_no || !password) {
      return res.status(400).json({ error: "Roll Number and password are required." });
    }
    const student = db.authenticateStudent(roll_no, password);
    res.json({ student });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Login by scanning an ID card. The barcode encodes the Roll Number itself,
// so this is a direct lookup -- no password needed. If the roll number
// isn't registered yet, the frontend routes to registration with it
// pre-filled, so the same card works automatically from then on.
router.post("/card-login", (req, res) => {
  const { roll_no } = req.body;
  if (!roll_no) return res.status(400).json({ error: "No Roll Number was scanned." });
  try {
    const student = db.authenticateStudentByCard(roll_no.trim());
    res.json({ student });
  } catch (err) {
    res.status(404).json({ error: err.message, new_card: true, roll_no: roll_no.trim() });
  }
});

// Toggle bookmark on a teacher
router.post("/:roll_no/bookmark", (req, res) => {
  try {
    const { emp_id } = req.body;
    if (!emp_id) return res.status(400).json({ error: "emp_id is required." });
    const bookmarks = db.toggleBookmark(req.params.roll_no, emp_id);
    res.json({ bookmarked_teachers: bookmarks });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
