# MoveInSync — Visitor Management System (VMS)

<div align="center">

![MoveInSync VMS](https://img.shields.io/badge/MoveInSync-VMS-1b22a6?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-MERN-00d09e?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-40%2F40%20Passing-brightgreen?style=for-the-badge)
![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge)

**A production-grade enterprise Visitor Management System built for the MoveInSync case-study assignment.**

</div>

---

## 📋 Problem Statement

Modern office campuses require a secure, auditable, and frictionless way to manage visitor access. Existing paper-based systems are slow, insecure, and provide no real-time visibility. MoveInSync VMS replaces paper logbooks with a digital-first, role-aware, QR-powered visitor management platform.

---

## ✨ Features

| Feature | Status |
|---|---|
| Visitor Registration (with photo) | ✅ |
| Host Employee Search & Assignment | ✅ |
| Approval / Rejection Workflow | ✅ |
| Pre-Approval (bypass manual approval) | ✅ |
| Digital QR Visitor Pass | ✅ |
| Pass Verification (backend-validated) | ✅ |
| Front Desk Check-In / Check-Out | ✅ |
| Real-time Dashboard & Analytics | ✅ |
| Visitor & Visit History | ✅ |
| Reports with Charts | ✅ |
| Audit Logs (full action trail) | ✅ |
| JWT Authentication | ✅ |
| Role-Based Access Control (RBAC) | ✅ |
| Dark / Light Mode | ✅ |
| Responsive UI (mobile to desktop) | ✅ |
| Automated Backend Tests (40 tests) | ✅ |
| Production Build | ✅ |

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI library |
| Vite | 8 | Build tool |
| Tailwind CSS | 3 | Styling |
| React Router | 6 | Client routing |
| Axios | 1.x | HTTP client |
| Recharts | 3 | Charts & analytics |
| qrcode.react | latest | QR code rendering |
| Lucide React | latest | Icons |
| React Hot Toast | 2 | Notifications |
| date-fns | 4 | Date formatting |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| Express.js | 4 | Web framework |
| MongoDB | 7+ | Database |
| Mongoose | 8 | ODM |
| jsonwebtoken | 9 | JWT auth |
| bcryptjs | 2 | Password hashing |
| Multer | 1 | File uploads |
| Cloudinary | 1 | Cloud image storage |
| Helmet | 7 | HTTP security headers |
| express-rate-limit | 7 | Rate limiting |
| express-mongo-sanitize | 2 | NoSQL injection prevention |
| qrcode | 1 | Server-side QR generation |

### Testing
| Tool | Purpose |
|---|---|
| Jest | Test runner |
| Supertest | HTTP testing |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│  Dashboard │ Visitors │ Approvals │ Front Desk │ Reports │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS / Axios
┌─────────────────────────▼───────────────────────────────┐
│               BACKEND (Express.js + Node.js)             │
│                                                          │
│  middleware: JWT auth → RBAC → Rate limit → Sanitize     │
│                                                          │
│  Routes: /api/auth /api/visitors /api/approvals          │
│          /api/passes /api/visits /api/reports            │
│          /api/audit-logs /api/users                      │
└─────────────────────────┬───────────────────────────────┘
                          │ Mongoose
┌─────────────────────────▼───────────────────────────────┐
│                 MongoDB (Atlas or Local)                  │
│  Collections: users, visitors, approvals, visitorpasses, │
│               visits, auditlogs                          │
└─────────────────────────────────────────────────────────┘
                          │
            ┌─────────────▼──────────────┐
            │  Cloudinary (Photo Storage) │
            └────────────────────────────┘
```

---

## 📁 Folder Structure

```
movieSync/
├── client/                         # React frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Avatar.jsx
│   │   │   ├── Drawer.jsx
│   │   │   ├── EmployeeSearch.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── RouteGuards.jsx
│   │   │   ├── Skeleton.jsx
│   │   │   ├── States.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # JWT auth state
│   │   │   └── ThemeContext.jsx    # Dark/light mode
│   │   ├── layouts/
│   │   │   ├── AppShell.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Topbar.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── VisitorsPage.jsx
│   │   │   ├── VisitorDetailPage.jsx
│   │   │   ├── VisitorPassPage.jsx  # Digital QR pass
│   │   │   ├── InviteVisitorPage.jsx
│   │   │   ├── ApprovalsPage.jsx
│   │   │   ├── FrontDeskPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── AuditLogsPage.jsx
│   │   │   └── UnauthorizedPage.jsx
│   │   ├── services/
│   │   │   ├── api.js             # Axios instance
│   │   │   └── index.js           # Service exports
│   │   ├── App.jsx                # Routes
│   │   ├── main.jsx
│   │   └── index.css              # Tailwind + design tokens
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                         # Express backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── visitorController.js
│   │   │   ├── approvalController.js
│   │   │   ├── passController.js
│   │   │   ├── visitController.js
│   │   │   ├── reportController.js
│   │   │   ├── auditLogController.js
│   │   │   └── userController.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT protect middleware
│   │   │   ├── authorize.js       # RBAC middleware
│   │   │   ├── errorHandler.js
│   │   │   └── upload.js          # Multer / Cloudinary
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Visitor.js
│   │   │   ├── Approval.js
│   │   │   ├── VisitorPass.js
│   │   │   ├── Visit.js
│   │   │   └── AuditLog.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── visitors.js
│   │   │   ├── approvals.js
│   │   │   ├── passes.js
│   │   │   ├── visits.js
│   │   │   ├── reports.js
│   │   │   ├── auditLogs.js
│   │   │   └── users.js
│   │   ├── services/
│   │   │   ├── auditService.js
│   │   │   ├── passService.js     # Gate validation logic
│   │   │   └── photoService.js    # Cloudinary / local upload
│   │   ├── app.js                 # Express app (no DB)
│   │   └── server.js              # Entry point (connects DB)
│   ├── tests/
│   │   ├── api.test.js            # 40 Jest + Supertest tests
│   │   ├── setup.js               # Jest global setup
│   │   └── teardown.js
│   ├── seed.js                    # Database seed script
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🗄 Database Design

### Collections / Models

#### `users`
```js
{
  name: String,          // required
  email: String,         // unique, indexed
  password: String,      // bcrypt hash — NEVER returned to client
  role: enum             // ADMIN | HOST | FRONT_DESK
  department: String,
  phone: String,
  isActive: Boolean,
  timestamps: true
}
```

#### `visitors`
```js
{
  visitorId: String,     // VIS-XXXXXX, indexed
  fullName: String,      // indexed
  phone: String,         // indexed
  email: String,
  company: String,
  purpose: enum,         // Meeting | Delivery | Interview | ...
  hostId: ObjectId,      // ref: User
  department: String,
  visitDate: Date,       // indexed
  startTime: String,     // HH:MM
  endTime: String,       // HH:MM
  status: enum,          // PENDING | APPROVED | REJECTED | PRE_APPROVED | CHECKED_IN | CHECKED_OUT | EXPIRED
  isPreApproved: Boolean,
  photoUrl: String,
  photoPublicId: String,
  createdBy: ObjectId,   // ref: User
  notes: String,
  timestamps: true
}
```

#### `approvals`
```js
{
  visitorId: ObjectId,   // ref: Visitor, indexed
  hostId: ObjectId,      // ref: User
  requestedBy: ObjectId, // ref: User
  status: enum,          // PENDING | APPROVED | REJECTED
  approvedAt: Date,
  rejectedAt: Date,
  remarks: String,       // rejection reason
  timestamps: true
}
```

#### `visitorpasses`
```js
{
  visitorId: ObjectId,   // ref: Visitor, indexed
  passCode: String,      // VIS-XXXXXXXX, unique, indexed
  qrPayload: String,     // JSON: { passCode, visitorId, issuedAt }
  validFrom: Date,
  validUntil: Date,
  status: enum,          // ACTIVE | EXPIRED | REVOKED | USED
  generatedBy: ObjectId, // ref: User
  revokedAt: Date,
  revokedBy: ObjectId,
  timestamps: true
}
```

#### `visits`
```js
{
  visitorId: ObjectId,   // ref: Visitor, indexed
  passId: ObjectId,      // ref: VisitorPass
  checkInTime: Date,
  checkOutTime: Date,
  checkedInBy: ObjectId, // ref: User
  checkedOutBy: ObjectId,
  duration: Number,      // minutes
  timestamps: true
}
```

#### `auditlogs`
```js
{
  actor: ObjectId,       // ref: User
  action: String,        // VISITOR_CREATED | VISITOR_APPROVED | ...
  entityType: String,    // Visitor | User | Pass | ...
  entityId: ObjectId,
  metadata: Mixed,       // additional context
  timestamp: Date,       // indexed
  timestamps: true
}
```

---

## 🔒 Authentication

- **Algorithm**: JWT (HS256)
- **Secret**: `process.env.JWT_SECRET` (min 32 chars recommended)
- **Expiry**: `7d` (configurable via `JWT_EXPIRES_IN`)
- **Storage**: `Authorization: Bearer <token>` header
- **Password**: bcrypt (cost factor 12)
- **Password never returned**: `safeUser()` strips password from all responses

---

## 👥 Role Permissions

| Feature | ADMIN | HOST | FRONT_DESK |
|---|:---:|:---:|:---:|
| View all visitors | ✅ | ❌ | ✅ |
| Invite visitors | ✅ | ✅ | ❌ |
| View own visitors | ✅ | ✅ | ✅ |
| Approve / Reject | ✅ | ✅ (own only) | ❌ |
| Pre-approve | ✅ | ✅ | ❌ |
| Check-In | ✅ | ❌ | ✅ |
| Check-Out | ✅ | ❌ | ✅ |
| Reports | ✅ | Partial | ❌ |
| Audit Logs | ✅ | ❌ | ❌ |
| User management | ✅ | ❌ | ❌ |

---

## 🛣 API Endpoints

### Auth
```
POST   /api/auth/login        Login and receive JWT
POST   /api/auth/logout       Logout (clears session)
GET    /api/auth/me           Get current user
POST   /api/auth/register     [ADMIN] Create a user
```

### Visitors
```
GET    /api/visitors           List visitors (paginated, filtered)
POST   /api/visitors           Create visitor
GET    /api/visitors/today     Today's visitors
GET    /api/visitors/:id       Visitor detail
PATCH  /api/visitors/:id       Update visitor
DELETE /api/visitors/:id       [ADMIN] Delete visitor
```

### Approvals
```
GET    /api/approvals          List approvals (status filter)
GET    /api/approvals/:id      Single approval
PATCH  /api/approvals/:id/approve   Approve visitor
PATCH  /api/approvals/:id/reject    Reject visitor
```

### Passes
```
GET    /api/passes/visitor/:visitorId    Get pass for visitor
POST   /api/passes/generate/:visitorId  Generate pass
GET    /api/passes/verify/:passCode     Verify pass (gate check)
```

### Visits
```
POST   /api/visits/checkin/:visitorId   Check in
POST   /api/visits/checkout/:visitorId  Check out
GET    /api/visits                      [ADMIN] Visit history
```

### Reports
```
GET    /api/reports/dashboard    Dashboard counts
GET    /api/reports/analytics    Analytics (charts data)
```

### Audit Logs
```
GET    /api/audit-logs           List logs (paginated, filtered)
```

---

## 🔄 Visitor Workflow

```
Invite (Admin/Host)
       ↓
  PENDING
       ↓
  Host Reviews → APPROVED / REJECTED
       ↓
  Pass Generated (passCode + QR)
       ↓
  Front Desk scans QR / enters passCode
       ↓
  CHECKED_IN → Visit record created
       ↓
  CHECKED_OUT → Duration calculated
```

### Pre-Approval Flow
```
Invite with isPreApproved=true
       ↓
  PRE_APPROVED (immediate)
       ↓
  Pass Generated automatically
       ↓
  Front Desk check-in (within window)
       ↓
  CHECKED_IN → CHECKED_OUT
```

---

## 🔐 Security

| Measure | Implementation |
|---|---|
| SQL/NoSQL injection prevention | `express-mongo-sanitize` |
| HTTP security headers | `helmet` |
| Rate limiting | `express-rate-limit` (100 req/15min for auth) |
| CORS whitelist | Explicit `CLIENT_URLS` env var |
| Password hashing | bcrypt (cost 12) |
| JWT signature | HS256 with secret from env |
| File upload validation | MIME type + size limit (5MB) |
| Error leakage prevention | Centralized error handler (no stack traces in prod) |
| Authorization | Role-based middleware on every protected route |

---

## 🧪 Testing

### Run Tests
```bash
cd server
npm test
```

### Test Results
```
Test Suites: 1 passed, 1 total
Tests:       40 passed, 40 total
Time:        ~2s
```

### Coverage by Suite

| Suite | Tests | Status |
|---|---|---|
| Authentication | 6 | ✅ |
| Visitor Registration | 9 | ✅ |
| Approval Workflow | 7 | ✅ |
| Pre-Approval | 2 | ✅ |
| Pass Verification | 3 | ✅ |
| Check-In / Check-Out | 6 | ✅ |
| Reports | 3 | ✅ |
| Audit Logs | 4 | ✅ |

---

## ⚙ Environment Setup

### Backend `.env`

Create `server/.env` (see `server/.env.example`):

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/moveinsync_vms
JWT_SECRET=your_super_secure_jwt_secret_at_least_32_chars
JWT_EXPIRES_IN=7d
CLIENT_URLS=http://localhost:5173,http://localhost:5174
NODE_ENV=development

# Optional: Cloudinary (leave blank for local disk uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Frontend `.env`

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5001/api
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 20+
- MongoDB (local) OR MongoDB Atlas connection string

### Step 1 — Install dependencies
```bash
# Backend
cd server && npm install

# Frontend
cd client && npm install
```

### Step 2 — Set up environment variables
```bash
cp server/.env.example server/.env
# Edit server/.env with your values
```

### Step 3 — Seed the database
```bash
cd server && npm run seed
```

### Step 4 — Start servers

```bash
# Terminal 1 — Backend (port 5001)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

Open **http://localhost:5173**

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@moveinsync.com | Admin@123 |
| Host | host@moveinsync.com | Host@123 |
| Front Desk | frontdesk@moveinsync.com | Desk@123 |

---

## 📦 Production Build

```bash
cd client && npm run build
# Output: client/dist/
```

---

## ☁ Deployment

### Frontend — Vercel

1. Connect GitHub repository
2. Set root directory to `client/`
3. Add env variable: `VITE_API_URL=https://your-api.render.com/api`
4. Deploy

### Backend — Render / Railway

1. Connect repository
2. Set root directory to `server/`
3. Build command: `npm install`
4. Start command: `node src/server.js`
5. Set all env variables from `.env.example`

### MongoDB — Atlas

1. Create cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Whitelist `0.0.0.0/0` (or specific IPs)
3. Create database user
4. Copy connection string to `MONGO_URI`

---

## 📊 Complexity Analysis

| Operation | Complexity | Index Used |
|---|---|---|
| Visitor lookup by ID | O(log n) | `_id` |
| Visitor search by name | O(log n + k) | text index on `fullName` |
| Visitor search by phone | O(log n) | `phone` index |
| Today's visitors query | O(log n + k) | `visitDate` index |
| Pass verification | O(log n) | `passCode` unique index |
| Approval lookup by visitor | O(log n) | `visitorId` index |
| Audit log query with filter | O(log n + k) | `timestamp` + `action` |
| Dashboard aggregation | O(n) | Uses `visitDate` + `status` indexes |
| Pagination | O(log n + page×limit) | Skip + limit on indexed field |

**Why indexes?** MongoDB performs full collection scans without indexes. With 10,000+ visitor records, an unindexed query on `visitDate` would scan every document. Indexes reduce lookup to O(log n) by maintaining a B-tree structure.

---

## 🎬 Demo Checklist (MoveInSync Submission)

### Workflow to Demo
1. **Login** as Admin
2. **Dashboard** — show real-time stats (today's visitors, pending, inside)
3. **Invite Visitor** — fill form, select host, upload photo, submit
4. **Approval** — login as Host, approve the visitor
5. **Digital Pass** — show QR code pass with visitor info
6. **Front Desk** — enter pass code, verify, check in
7. **Currently Inside** — visitor appears in Front Desk "Inside" tab
8. **Check Out** — check out visitor, see duration
9. **History** — visitor appears in completed visits
10. **Reports** — show charts and download data
11. **Audit Logs** — show full action trail
12. **Rejected Test** — reject a visitor, attempt check-in, show denial
13. **Expired Pass** — attempt expired pass, show gate denial

### Screenshot Checklist
- [ ] Login page
- [ ] Admin dashboard with stats
- [ ] Invite visitor form
- [ ] Host approval screen
- [ ] Visitor pass (QR code)
- [ ] Front desk verification
- [ ] Check-in confirmation
- [ ] Check-out with duration
- [ ] Reports page with charts
- [ ] Audit logs

---

## 🚧 Known Limitations

1. **QR Scanning**: Browser-based camera QR scanning requires HTTPS and a compatible browser. Manual pass-code entry is always available as fallback.
2. **Image optimization**: Large visitor photos are stored as-is locally; Cloudinary auto-optimizes when configured.
3. **Real-time updates**: Dashboard doesn't auto-refresh (manual refresh button provided). WebSocket push notifications would be a future improvement.
4. **Email notifications**: Host email notification on visitor creation is not implemented (placeholder for SMTP integration).
5. **Multi-building support**: Single-campus design; multi-campus/floor support would require schema extensions.

---

## 🔮 Future Improvements

- Email/SMS notifications to host and visitor
- Browser-push notifications for real-time updates
- Recurring visitor / VIP whitelist
- Bulk visitor import (CSV)
- Facial recognition integration
- Mobile app (React Native)
- Multi-campus / zone support
- Visitor badge printing integration
- SAML/SSO integration
- Advanced analytics (heatmaps, peak-hour detection)
