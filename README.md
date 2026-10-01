# Campus Coin – Smart Spending Student Style (Backend API)

A clean, modular, production-ready REST API backend built for **Campus Coin**, designed specifically to meet all requirements of the Campus Coin Software Requirements Specification (SRS).

---

## 🚀 Key Features

* **Student Authentication & Session Management**: Secure JWT-based authentication, bcrypt password hashing, token-based password recovery flow, and role-based access.
* **Separated Administrator Portal**: Dedicated administrator model, protected routes, and idempotent database seeding (no public admin registration).
* **Smart Financial Categorization**:
  * Default system categories (Allowance, Food, Transport, Hostel/Rent, Academics, Subscriptions, Entertainment, etc.) with deletion protection for students.
  * Personal custom category creation with color and icon support.
* **Transaction Engine & Innovations**:
  * Full income & expense tracking with pagination, search, category filters, and date range filters.
  * **Rule-based Keyword Category Suggestion**: Advisory auto-categorization without automated overriding of user data.
  * **Duplicate Transaction Detection**: Warns the student if a matching transaction (amount, category, date, description) is detected.
  * **Unusually Large Transaction Detection**: Identifies expense spikes exceeding recent 30-day spending averages.
* **Budgeting System & Threshold Alerts**:
  * Monthly category budget limits with live consumption calculation.
  * Automated in-app notifications at 80%, 90%, and 100% threshold crossings (idempotent, prevents duplicate alerts).
* **Personalized Saving Tips Engine**: Rule-based analysis of spending habits (e.g. food > 35%, subscription audits, transport surges) with bookmark/pin and dismissal support.
* **Monthly Narrative Insights**: Plain-language student-friendly summaries with comparison against previous month data and financial disclaimers.
* **Comprehensive Financial Reports & PDF Export**:
  * Monthly, 6-month historical trends, daily, and weekly breakdown aggregations.
  * Statistical rule-based forecast for next-month spending and savings.
  * Clean, formatted PDF statement export using `pdfkit`.
* **CSV Bulk Import**: Multer-powered upload with schema validation, error row reporting, and automatic category mapping.
* **Comprehensive Admin Management**:
  * Platform overview & dashboard metrics (active/disabled users, transaction volumes, top categories).
  * Student account status controls (active / deactivated) and account deletion.
  * System default category management.
  * Campus announcements & tip templates broadcasting.

---

## 🛠️ Technology Stack

* **Runtime**: Node.js (CommonJS)
* **Framework**: Express.js
* **Database**: MongoDB with Mongoose ODM
* **Security & Auth**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cors`
* **File Uploads & Parsing**: `multer`, `csv-parser`
* **Validation**: `express-validator`
* **Document Generation**: `pdfkit`
* **Environment Configuration**: `dotenv`

---

## 📁 Project Structure

```
backend/
├── config/
│   └── db.js                        # Mongoose database connection
├── controllers/
│   ├── adminController.js           # Admin login, user status, categories, stats, announcements
│   ├── authController.js            # Registration, login, password recovery, me
│   ├── budgetController.js          # Budget creation, tracking, status, threshold alerts
│   ├── categoryController.js        # Category CRUD with system default protection
│   ├── importController.js          # Multer CSV upload handler
│   ├── insightController.js         # Plain-language monthly narrative insights
│   ├── notificationController.js    # In-app notifications list and read status
│   ├── reportController.js          # Reports aggregation and PDF statement export
│   ├── tipController.js             # Rule-based personalized saving tips
│   ├── transactionController.js     # Transactions CRUD, filters, suggestions & warnings
│   └── userController.js            # Profile updates and password change
├── middleware/
│   ├── adminMiddleware.js           # Verifies administrator JWT token
│   ├── authMiddleware.js            # Verifies student JWT token and active status
│   ├── errorMiddleware.js           # Centralized 404 and Mongoose error handler
│   └── validationMiddleware.js      # Express-validator error handler
├── models/
│   ├── Admin.js                     # Administrator credentials
│   ├── Announcement.js              # Broadcast announcements & tip templates
│   ├── Budget.js                    # Category budget limits and tracked alert states
│   ├── Category.js                  # System default & personal categories
│   ├── Insight.js                   # Monthly summary insights
│   ├── Notification.js              # User alerts and system notifications
│   ├── PasswordResetToken.js        # Expiring password recovery tokens
│   ├── SavingTip.js                 # Financial saving tips (pinned/dismissed)
│   ├── Transaction.js               # Incomes and expenses with indexes
│   └── User.js                      # Student model with password hashing
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── budgetRoutes.js
│   ├── categoryRoutes.js
│   ├── dashboardRoutes.js
│   ├── importRoutes.js
│   ├── insightRoutes.js
│   ├── notificationRoutes.js
│   ├── reportRoutes.js
│   ├── tipRoutes.js
│   ├── transactionRoutes.js
│   └── userRoutes.js
├── services/
│   ├── csvImportService.js          # CSV parsing and batch creation
│   ├── dashboardService.js          # Aggregated dashboard metrics builder
│   ├── insightService.js            # Narrative summary generator
│   ├── reportService.js             # MongoDB aggregations & PDF document stream
│   ├── savingTipService.js          # Rule-based financial tips engine
│   └── transactionAnalysisService.js# Keyword suggestions, duplicate & spike detection
├── utils/
│   ├── generateToken.js             # JWT signer helper
│   ├── seedDefaults.js              # Idempotent default categories & admin seeder
│   └── validators.js                # Express-validator schemas
├── uploads/                         # Temporary CSV upload folder
├── .env                             # Environment variables
├── .env.example                     # Environment template
├── .gitignore
├── package.json
├── server.js                        # App entry point
└── testBackend.js                   # Automated test suite (43 test cases)
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory (or copy from `.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/campus_coin_db
JWT_SECRET=super_secret_campus_coin_jwt_key_2026_dev
CLIENT_URL=http://localhost:5173
ADMIN_USERNAME=admin
ADMIN_PASSWORD=AdminCampusCoin2026!
```

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend Server
For development with auto-reload:
```bash
npm run dev
```

For standard production run:
```bash
npm start
```

When the server starts:
* MongoDB connection will be established.
* The 12 default categories and the default Administrator account are automatically and idempotently seeded.

### 3. Run Automated Tests
```bash
npm test
```
Runs 43 automated integration tests verifying authentication, data isolation, budget threshold triggers, reports, PDF export, duplicate detection, and admin functionality.

---

## 🔑 Test Credentials

| Role | Username / Email | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `AdminCampusCoin2026!` | Configured via `.env`. Seeding is idempotent. |
| **Student (Self-Registered)** | *Any valid email* | *6+ characters* | e.g. `alex@campus.edu` / `Password123!` |

---

## 📡 API Reference Overview

Base URL: `http://localhost:5000/api`

### 1. Authentication (`/api/auth`)
* `POST /register` - Register a new student account
* `POST /login` - Student login (returns JWT)
* `POST /forgot-password` - Request secure password reset token
* `POST /reset-password/:token` - Reset password using recovery token
* `GET /me` - Get current authenticated student details

### 2. User Profile (`/api/users`)
* `GET /profile` - Get student profile
* `PUT /profile` - Update name, academic year, monthly allowance, savings goal
* `PUT /change-password` - Change password (requires current password)

### 3. Categories (`/api/categories`)
* `GET /` - List default system categories + personal categories
* `POST /` - Create personal custom category
* `PUT /:id` - Update personal category
* `DELETE /:id` - Delete personal category (default categories are protected)

### 4. Transactions (`/api/transactions`)
* `POST /` - Record transaction (returns duplicate and large-spending advisory warnings)
* `GET /` - List transactions (supports `page`, `limit`, `startDate`, `endDate`, `category`, `type`, `search`, `sortBy`)
* `GET /:id` - Get transaction details
* `PUT /:id` - Update transaction
* `DELETE /:id` - Delete transaction
* `GET /summary` - Overall income, expense, and balance summary
* `GET /monthly` - Group transactions by month
* `POST /suggest-category` - Advisory keyword-based category auto-suggestion

### 5. Budgets (`/api/budgets`)
* `POST /` - Set monthly category budget
* `GET /` - List budgets
* `GET /status` - Live consumption percentages and threshold evaluation (80%, 90%, 100%)
* `PUT /:id` - Update budget limit
* `DELETE /:id` - Delete budget

### 6. Dashboard (`/api/dashboard`)
* `GET /` - Comprehensive dashboard data (balance, income/expense this month, top category, budget vs actual, 7-day trend, recent transactions, active tips, notifications)

### 7. Saving Tips (`/api/tips`)
* `GET /` - Get personalized tips (pinned tips first)
* `POST /generate` - Re-analyze spending patterns and generate fresh tips
* `POST /:id/pin` - Pin / unpin tip
* `POST /:id/dismiss` - Dismiss tip

### 8. Monthly Insights (`/api/insights`)
* `GET /current` - Plain-language monthly narrative summary with disclaimer
* `GET /history` - Historical monthly summaries
* `POST /generate` - Trigger insight generation for a specific month

### 9. Notifications (`/api/notifications`)
* `GET /` - View in-app notifications
* `PUT /:id/read` - Mark single notification as read
* `PUT /read-all` - Mark all notifications as read

### 10. Reports & Exports (`/api/reports`)
* `GET /monthly` - Monthly breakdown & category shares
* `GET /six-months` - 6-month income vs expense historical trend
* `GET /daily` - Day-by-day expense timeline
* `GET /weekly` - Weekly expense aggregation
* `GET /category` - Category-wise spending breakdown
* `GET /forecast` - Statistical next-month expense & savings estimate
* `GET /export` - Download monthly financial statement PDF

### 11. CSV Import (`/api/import`)
* `POST /transactions` - Upload CSV file (`multipart/form-data`) with columns: `amount, type, category, description, date`

### 12. Administrator Panel (`/api/admin`)
* `POST /login` - Admin login
* `GET /dashboard` - System overview metrics
* `GET /users` - List all students (paginated & searchable)
* `GET /users/:id` - Student account details & statistics
* `PUT /users/:id/status` - Activate or deactivate student account
* `DELETE /users/:id` - Delete student account and all linked records
* `GET /categories` - View all categories
* `POST /categories` - Create new system default category
* `PUT /categories/:id` - Update system default category
* `DELETE /categories/:id` - Remove system default category
* `GET /statistics` - Platform transaction volumes
* `GET /announcements` - List announcements
* `POST /announcements` - Publish announcement / broadcast notification to all students
* `PUT /announcements/:id` - Update announcement
* `DELETE /announcements/:id` - Remove announcement

---

## 🔒 Security & Data Protection Design

* **No Plain-Text Passwords**: Passwords hashed using `bcryptjs` with salt rounds = 10.
* **Separation of Concerns**: Admin and Student logins and permissions are strictly decoupled.
* **Data Isolation**: Database queries enforce `user: req.user._id` across all personal endpoints; students cannot read, edit, or delete another student's transactions or budgets.
* **Centralized Error Handling**: Standardized `{ success: false, message: "..." }` responses; sensitive database stack traces are suppressed in production.
