const express = require("express");
const path = require("path");

const teacherRoutes = require("./routes/teachers");
const studentRoutes = require("./routes/students");
const materialRoutes = require("./routes/materials");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend
app.use(express.static(path.join(__dirname, "public")));
// Uploaded files (served so <a href> / fetch download links work directly too)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API routes
app.use("/api/teachers", teacherRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/materials", materialRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "EduVault" }));

// Fallback 404 for unknown API routes
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`EduVault server running at http://localhost:${PORT}`);
});
