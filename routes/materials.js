const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const router = express.Router();
const db = require("../db");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXT = [".pdf", ".ppt", ".pptx", ".doc", ".docx", ".txt", ".jpg", ".jpeg", ".png"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomUUID();
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(new Error("Unsupported file type. Allowed: PDF, PPT/PPTX, DOC/DOCX, TXT, JPG, PNG."));
    }
    cb(null, true);
  },
});

// Teacher uploads a material
router.post("/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const { emp_id, subject, title, unit, semester } = req.body;
      if (!emp_id || !subject || !title) {
        return res.status(400).json({ error: "emp_id, subject and title are required." });
      }
      if (!req.file) {
        return res.status(400).json({ error: "A file is required." });
      }
      const material = db.addMaterial({
        emp_id,
        subject,
        title,
        unit,
        semester,
        file_url: `/uploads/${req.file.filename}`,
        original_name: req.file.originalname,
      });
      res.status(201).json({ material });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
});

// List materials for a given teacher (this is what a student sees after
// looking up a teacher by Employee ID + name -- the full permanent history,
// regardless of when the student's account was created)
router.get("/teacher/:emp_id", (req, res) => {
  const teacher = db.findTeacher(req.params.emp_id);
  if (!teacher) return res.status(404).json({ error: "Teacher not found." });
  const materials = db.materialsByTeacher(req.params.emp_id);
  res.json({ teacher: db.sanitizeTeacher(teacher), materials });
});

// Download a material (logs access if roll_no is supplied as a query param)
router.get("/download/:material_id", (req, res) => {
  const material = db.findMaterial(req.params.material_id);
  if (!material) return res.status(404).json({ error: "Material not found." });

  const roll_no = req.query.roll_no;
  if (roll_no) {
    db.logAccess({ roll_no, material_id: material.material_id });
  }

  const filePath = path.join(UPLOAD_DIR, path.basename(material.file_url));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File missing on server." });
  }
  res.download(filePath, material.original_name || path.basename(filePath));
});

// Delete a material (teacher only, verified by emp_id ownership)
router.delete("/:material_id", (req, res) => {
  try {
    const { emp_id } = req.body;
    if (!emp_id) return res.status(400).json({ error: "emp_id is required." });
    const removed = db.deleteMaterial(req.params.material_id, emp_id);
    const filePath = path.join(UPLOAD_DIR, path.basename(removed.file_url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
