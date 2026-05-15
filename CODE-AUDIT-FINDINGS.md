# Code Audit Findings — Activity Tracker (Rhythm)

## 🔴 Critical Security Vulnerabilities

### 1. Hardcoded JWT_SECRET in Committed .env
- **File:** `backend/.env` line 7 — `JWT_SECRET=0bWCWm/Ull2ZbpCxAd61BJyLYO9QflTXvr6aFZMu/uo=` is committed to git
- **Impact:** Anyone with repo access can forge JWTs. `.env` is in `.gitignore` now but the secret persists in git history
- **Fix:** Rotate the secret, scrub from git history, add `JWT_SECRET` to `.env.example`

### 2. Stored XSS via Un‑sanitized `dangerouslySetInnerHTML`
- **`BookNoteWidget.jsx:230`** — `dangerouslySetInnerHTML={{ __html: note.content }}` with no DOMPurify
- **`FavouriteNoteModal.jsx:148`** — Same pattern, no sanitization
- **Impact:** Any `<script>` in note content executes in user's browser
- **Contrast:** `Notes.jsx` lines 17-18 correctly uses DOMPurify with `FORBID_ATTR: ["style"]`
- **Fix:** Add DOMPurify to both components

### 3. Refresh Token Rotation Race Condition
- **File:** `backend/controllers/tokenController.js` lines 79-88
- **Issue:** `SELECT` then `UPDATE` as separate operations. Concurrent requests with the same stolen token both pass the check
- **Fix:** Atomic `UPDATE ... WHERE revoked_at IS NULL` with `affectedRows` check, or `SELECT ... FOR UPDATE`

### 4. JWT Stored in `localStorage` / `sessionStorage`
- **File:** `AuthContext.jsx` lines 21, 95-96, 140-141
- **Issue:** Access tokens and full user objects (PII) in JS-accessible storage. Any XSS exfiltrates the token permanently
- **Fix:** Use httpOnly cookies for access token too, or encrypt the localStorage value

### 5. No Upload Rate Limiting on Book Routes
- **File:** `server.js` line 57 — `uploadLimiter` only covers `/api/notes/upload`
- `booksController.js:30` — allows files up to **100MB** with no per-user quota
- **Fix:** Add `uploadLimiter` to book routes, reduce limit to 10MB

### 6. Full User Object Passed to `issueTokens`
- **File:** `userController.js:160` — passes entire DB row (incl. `password_hash`, `totp_secret`)
- **Fix:** Create safe projection `{ id, username, email }` before calling `issueTokens`

---

## 🟠 High Severity

### 7. Debug `console.log` in Production Code
- **`Profile.jsx` lines 135, 162, 173, 181** — Logs username changes, email changes, full update payload, server responses (PII leak)
- **`notesController.js` lines 78-149** — 15+ `console.log` statements logging request bodies, SQL queries, internal flow
- **`userController.js` lines 190-228** — Logs SQL query strings and DB results
- Pervasive `console.error` across every component with no environment gating

### 8. No Error Boundaries
- **`main.jsx`** — No `ErrorBoundary` wrapper. Any render-phase crash unmounts the entire React app

### 9. `JSON.parse(storedUser)` With No Try/Catch
- **`AuthContext.jsx:24`** — If localStorage has malformed JSON, throws uncaught exception, white screen crash

### 10. Audit Middleware Monkey-Patches `res.json`
- **`auditMiddleware.js:8-19`** — Overwrites `res.json` for entire middleware chain. Login audits always log `userId: null`
- **Fix:** Use `res.on('finish')` event instead

### 11. No Input Validation on Multiple Endpoints
- `favouriteProfilesController.js` — No validators middleware at all
- `booksController.js` — No validation on `current_page`, `daily_pages_goal`, `selected_text` length
- `monthlyTodosController.js` — No max length on text
- `expensesController.js` — `bill_date` not validated

### 12. `rememberMe` Re-Evaluated at Refresh Time
- **`AuthContext.jsx:134-148`** — `refreshTokens()` checks current `rememberMe` value, not the original intent. Session-only user can be promoted to persistent storage

### 13. No Client-Side JWT Expiry Check
- **`AuthContext.jsx:20-37`** — 5-minute blind trust window with no `exp` claim decode

---

## 🟡 Medium Severity

### 14. Monolithic Components
| File | Lines | Problem |
|------|-------|---------|
| `App.jsx` | 646 | 18 `useState` calls, all data logic in one function |
| `Books.jsx` | ~1035 | Library + reader combined, dozens of states |
| `Calendar.jsx` | ~530 | Three rendering modes in one component |
| `Expenses.jsx` | 616 | Hero + breakdown + categories in one file |
| `Notes.jsx` | ~450 | Form + list view combined |
| `FavouriteProfiles.jsx` | 559 | Cards + modals + 4 tabs in one file |

### 15. Prop Drilling
- `App.jsx` → `DashboardHome.jsx` — 23 props passed through. Should use context or data hook

### 16. Duplicated Table-Fallback Pattern
- `activityController.js` — `"ER_NO_SUCH_TABLE"` catch blocks repeated 5+ times across controllers

### 17. Dynamic `require()` Inside Request Handlers
- `userController.js:156,162` — `require("./tokenController")` and `require("speakeasy")` inside route handlers

### 18. Silent Failure on Token Revocation
- `userController.js:176` — `.catch(() => {})` swallows token revocation errors

### 19. Inconsistent `db` vs `pool` Variable Names
- Most controllers use `db`, but `booksController.js` and `monthlyTodosController.js` use `pool`

### 20. Mouse-Only Calendar Paint Feature
- `Calendar.jsx` — Click-drag toggle only works with mouse (onMouseDown/Enter/Up)

---

## 🔵 Low Severity

| # | Issue | File | Lines |
|---|-------|------|-------|
| 21 | CORS falls back to localhost | `server.js` | 40 |
| 22 | HSTS breaks localhost dev | `server.js` | 24-35 |
| 23 | 10MB body parser DoS vector | `server.js` | 51-52 |
| 24 | Dead/commented code | `BookNoteWidget.jsx`, `DayDetailsModal.jsx` | 131, 125 |
| 25 | Non-semantic HTML (div as button) | `Expenses.jsx`, `Calendar.jsx` | 390+ |
| 26 | `document.execCommand` deprecated | `RichTextEditor.jsx`, `StickyNoteEditor.jsx`, `Books.jsx` | 22-24, 48, 72 |
| 27 | Empty catch blocks | `FavouriteProfiles.jsx` | 346, 354, 371, 380 |

---

## 🛠 Top 10 Priority Fixes

1. **Rotate JWT_SECRET** — scrub from git, add to `.env.example`
2. **Add DOMPurify** to `BookNoteWidget.jsx:230` and `FavouriteNoteModal.jsx:148`
3. **Fix refresh token race condition** — atomic `UPDATE ... WHERE revoked_at IS NULL`
4. **Remove debug `console.log`** from `Profile.jsx`, `notesController.js`, `userController.js`
5. **Add `ErrorBoundary`** in `main.jsx`
6. **Add try/catch** around `JSON.parse(storedUser)` in `AuthContext.jsx:24`
7. **Add `uploadLimiter` to book routes** + reduce 100MB → 10MB
8. **Add input validation** to favourite profiles, books, monthly todos
9. **Replace audit monkey-patch** with `res.on('finish')`
10. **Create safe user projection** before `issueTokens`
