// Shared helpers used across every page.
// Auth here is intentionally simple (no JWT/session cookie) -- it stores the
// logged-in profile in localStorage after a successful login/register call.
// This is a simplification appropriate for a college demo project; the
// project report lists proper token-based auth under "Future Scope".

function toast(msg, isError) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = isError ? "err show" : "show";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

async function api(path, options = {}) {
  const opts = { headers: {}, ...options };
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch("/api" + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function saveTeacher(teacher) {
  localStorage.setItem("eduvault_teacher", JSON.stringify(teacher));
}
function getTeacher() {
  try { return JSON.parse(localStorage.getItem("eduvault_teacher")); } catch { return null; }
}
function clearTeacher() { localStorage.removeItem("eduvault_teacher"); }

function saveStudent(student) {
  localStorage.setItem("eduvault_student", JSON.stringify(student));
}
function getStudent() {
  try { return JSON.parse(localStorage.getItem("eduvault_student")); } catch { return null; }
}
function clearStudent() { localStorage.removeItem("eduvault_student"); }

function requireTeacher() {
  const t = getTeacher();
  if (!t) window.location.href = "/teacher-login.html";
  return t;
}
function requireStudent() {
  const s = getStudent();
  if (!s) window.location.href = "/student-login.html";
  return s;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function fileIcon(name) {
  const ext = (name || "").split(".").pop().toLowerCase();
  if (["ppt", "pptx"].includes(ext)) return "PPT";
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "DOC";
  if (["jpg", "jpeg", "png"].includes(ext)) return "IMG";
  return "FILE";
}
