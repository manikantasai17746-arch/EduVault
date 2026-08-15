# EduVault

A centralized teacher–student academic material sharing system, built to replace
scattered WhatsApp groups for distributing PDFs, PPTs, and notes.

**The core problem it solves:** WhatsApp only shows chat history from the moment
you join a group — so a student who joins late (or a lateral entry student
joining mid-program) can never see material shared before they arrived.
EduVault stores material against the *teacher's* profile in a database instead
of inside a chat thread, so a student who selects a teacher's Employee ID
always sees the complete history, from day one, regardless of when their own
account was created.

## Features

- **Teacher accounts** — register with Employee ID, department, and subjects handled
- **Scan-to-login ID cards** — the barcode on a college ID card already encodes the Employee ID / Roll Number, so scanning it with the device camera is a direct, password-free login. Unrecognized cards route straight into a one-time registration form with the ID pre-filled; from then on, that same card logs the person in instantly.
- **Upload material** — PDF, PPT/PPTX, DOC/DOCX, TXT, JPG, PNG (up to 25MB), tagged by subject, unit, and semester
- **Student accounts** — register once, then look up *any* teacher by Employee ID or name
- **Full history, always** — students see every file a teacher has ever uploaded, not just what's been posted since they joined
- **Bookmarks** — students can star frequently visited teachers for one-click access
- **Access analytics** — teachers see how many times each file has been accessed
- **Role-based, no external dependencies for storage** — data is stored in a local JSON file (`data/db.json`), which mirrors the relational design described in the project report (Teachers / Students / Materials / Access_Log tables) so it's a drop-in swap for real MySQL/MongoDB later

## Tech Stack

- **Backend:** Node.js + Express
- **File uploads:** Multer
- **Barcode scanning:** html5-qrcode (free, Google-backed, optimized for speed) — reads the camera feed client-side and decodes 1D barcodes (Code128, EAN, UPC, Code39) and QR codes fast and reliably
- **Database:** Lightweight JSON file store (`db.js`) — structured exactly like the relational schema in the report, so swapping in MySQL/MongoDB later only means rewriting `db.js`
- **Frontend:** Plain HTML/CSS/JS (no build step, no framework — runs directly in the browser)
- **Auth:** Simple password hashing (Node's built-in `crypto.scrypt`) as a fallback login method, plus password-free card login. Profile is stored in the browser's `localStorage` after login — a simplification appropriate for a college project demo, see "Future Improvements" below.

## Requirements

- [Node.js](https://nodejs.org) version 18 or later (check with `node -v`)

## Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open your browser to:
http://localhost:3000
```

That's it — no database server, no environment variables, no build step required.

To use a different port: `PORT=8080 npm start`

## How to demo it

**With a real barcode (recommended for your review):**

1. Open `http://localhost:3000` and click **Register** under "I'm a Teacher".
   Create a teacher profile using the Employee ID printed under your own
   college ID card's barcode (e.g. `EMP1042`).
2. From the teacher dashboard, upload a PDF/PPT and tag it with a subject.
3. Open a new browser tab and click **Login** under "I'm a Student", then
   tap **Scan ID Card** and hold up a student ID card whose barcode has
   never been used here before. Since it's not registered, you'll be sent
   to registration with the Roll Number already filled in — finish the
   short form once.
4. Log out and tap **Scan ID Card** again with the *same* card. This time
   it logs in instantly — no typing, no password. That's the core feature.
5. On the student portal, search for the teacher by Employee ID or name.
   You'll see every file they've uploaded — including anything uploaded
   *before* this student account existed, which is the entire point.
6. Download a file — this logs an access event. Go back to the teacher
   dashboard and refresh: the "views" count updates.
7. Star the teacher from the student portal to bookmark them for next time.

**Without a physical barcode:** every "Scan ID Card" button also has a
"Can't scan? Enter code manually" fallback inside the camera modal — type
any Employee ID / Roll Number there to simulate a scan. The manual
Employee ID/Roll Number + password forms below the scan button work too.

> Camera access requires the browser to trust the page. `localhost` is
> trusted automatically, so this works out of the box on your laptop. If
> you deploy it elsewhere, it needs to be served over HTTPS for the camera
> to be allowed.

## Project Structure

```
eduvault/
├── server.js              Express app entry point
├── db.js                  JSON-file data layer (Teachers/Students/Materials/Access_Log)
├── data/db.json            The "database" file itself
├── uploads/                Uploaded files are stored here
├── routes/
│   ├── teachers.js         Register, login, search, analytics
│   ├── students.js         Register, login, bookmarks
│   └── materials.js        Upload, list-by-teacher, download (+access logging), delete
└── public/                 Frontend (static HTML/CSS/JS)
    ├── index.html           Landing page
    ├── teacher-*.html        Teacher registration/login/dashboard
    ├── student-*.html        Student registration/login/portal
    ├── css/style.css
    └── js/common.js          Shared fetch/auth/toast helpers
```

## Database Design (as implemented)

| "Table" (array in db.json) | Key Fields |
|---|---|
| `teachers` | `emp_id` (key), `name`, `department`, `subjects_handled`, `email`, `password_hash` |
| `students` | `roll_no` (key), `name`, `department`, `semester`, `email`, `password_hash`, `bookmarked_teachers[]` |
| `materials` | `material_id`, `emp_id` (→ teachers), `subject`, `title`, `unit`, `semester`, `file_url`, `upload_date` |
| `accessLogs` | `log_id`, `roll_no` (→ students), `material_id` (→ materials), `accessed_on` |

`emp_id` is the anchor: every material links to exactly one teacher, and every
student lookup starts by resolving a teacher through this same field — which
is what guarantees full history regardless of when a student's account was
created.

## Future Improvements

(matches the "Future Scope" section of the project report)

- Swap `db.js` for real MySQL/MongoDB queries (the schema is already designed for it)
- Replace `localStorage`-based auth with proper JWT or session-based authentication
- Mobile app for offline access to downloaded material
- Push notifications when a teacher uploads new content
- AI-based auto-tagging of uploaded files by subject/unit
- Integration with college ERP for automatic student/teacher sync

## Notes on Security (for your viva/review)

This is a functional demo built for a college project review, not a
production system. If asked about security in your review, you can mention:

- Passwords are hashed (never stored in plain text) using `scrypt`
- File uploads are restricted by type and size
- **Card login is identity-by-possession, not identity-by-secret:** since
  the ID card's barcode is the Employee ID / Roll Number itself (not a
  secret), scanning it proves you're holding that physical card, the same
  trust model as swiping a badge at a door. It intentionally does not
  replace the password login — that's still there as a fallback, and a
  production version would pair the scan with a PIN or add expiry/rotation
  to reduce the impact of a lost or copied card.
- For production use, you'd add: HTTPS, JWT/session-based auth instead of
  client-stored profiles, rate limiting, and server-side input validation
  hardening — all listed under Future Scope in the report.
