# 🌟 Nano Project Managment: Field Project & Activity Management Platform
### 🇵🇸 نظام إدارة المشاريع والأنشطة الميدانية ثنائي اللغة (RTL-First)

Nano Project Managment is a state-of-the-art, open-source Field Project and Activity Management application built using **Next.js 16 (App Router)**, **React 19**, **Prisma v7 (Pg adapter)**, and **Tailwind CSS v4** with **shadcn/ui**. 

It is tailored for humanitarian and development programs (such as Gender Protection, Adolescent Girls Empowerment, Early Child Marriage Prevention, and FGM Advocacy) operating across multiple regional branches or physical centers.

---

## 🗺️ Table of Contents | جدول المحتويات
1. [Core Features | المميزات الرئيسية](#-core-features--المميزات-الرئيسية)
2. [Premium Design System | نظام التصميم الراقي](#-premium-design-system--نظام-التصميم-الراقي)
3. [Architecture & Stack | البنية البرمجية والتقنيات](#-architecture--stack--البنية-البرمجية-والتقنيات)
4. [Role-Based Workspaces | بيئات العمل حسب الصلاحيات](#-role-based-workspaces--بيئات-العمل-حسب-الصلاحيات)
5. [Database Schema | هيكلية قاعدة البيانات](#-database-schema--هيكلية-قاعدة-البيانات)
6. [Getting Started | دليل البدء والتشغيل](#-getting-started--دليل-البدء-والتشغيل)
7. [License | الترخيص](#-license--الترخيص)

---

## 🚀 Core Features | المميزات الرئيسية

### 🌐 1. Dual-Locale & RTL-First (Arabic / English) | ثنائية اللغة ودعم الاتجاه من اليمين لليسار
*   Powered by `next-intl` with full support for locale-aware routing (`/ar`, `/en`).
*   Dynamic, layout-direction flipping (LTR/RTL) with Cairo (Arabic typography) and Inter (English typography) fonts.
*   Bilingual navigation, search registries, analytics dashboards, Gantt charts, and toast notifications.

### 📅 2. Chronological Gantt Timeline View | مخطط غانت الزمني التفاعلي
*   An SSR-safe custom wrapper built on top of `frappe-gantt` with mouse-click popups.
*   Beautifully color-coded Gantt task bars representing real-time session states (Pending, Completed, Delayed, Approved, Rejected).
*   Activity/Session grouping filters, timeline zoom options (Week, Month, Quarter), and secondary mobile list fallback cards.

### 🤖 3. NovaAI: AI Project Copilot | المساعد الذكي لإدارة المشاريع
*   Exposes a secure OpenRouter-integrated conversational panel inside the workspace.
*   Generates real-time, context-aware analytics by automatically reading database aggregates (completed sessions, delay bottlenecks, center matrix performance, and missing documentation).
*   Supports quick action suggestions (e.g., "Analyze bottleneck centers", "Draft weekly compliance status").

### 📁 4. Google Drive Compliance Tracking | التوثيق الميداني عبر جوجل درايف
*   Custom validation and link parsing engine (`lib/drive-links.ts`) ensuring field supervisors upload secure, compliant verification folders.
*   Interactive documentation status badges (Launch, Warning, Missing) embedded in timeline side panels and PM review cards.
*   Exposes documentation compliance rates directly in the analytics report dashboard.

### 📈 5. Advanced Reports & Analytics Dashboard | التقارير والتحليلات المتقدمة
*   Visual execution density tracking over time using interactive `Recharts` graphs.
*   Center-scoped KPIs checking average PM approval turnaround speeds and branch delay averages.
*   Dedicated volunteer contribution widgets calculating separate completion rates.

---

## 🎨 Premium Design System | نظام التصميم الراقي

Built using **Tailwind CSS v4** and **shadcn/ui** base-nova preset, our design system relies entirely on OKLCH-based semantic tokens mapping both Light and Dark themes flawlessly:
*   **Surfaces & Borders:** curated dark glassmorphism effects (`rgba` backdrops, sleek HSL tailwinds).
*   **Status Indicators:** 8 dedicated status parameters covering standard/volunteer activities (OKLCH-based greens, ambers, purples, and deep reds).
*   **Zero Placeholders:** Every visual asset, tooltip, avatar, and calendar utilizes strict responsive components and premium dynamic SVG vectors.

---

## ⚙️ Architecture & Stack | البنية البرمجية والتقنيات

| Layer / الطبقة | Technology Stack / التقنية المستخدمة |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, CSS Variables, shadcn/ui |
| **Database** | PostgreSQL, Prisma v7 ORM |
| **Driver Adapter** | `@prisma/adapter-pg` & `pg` Client Pool |
| **Authentication** | Clerk Auth (Role-based Public Metadata) |
| **Localization** | `next-intl` (Middleware & Localized Routers) |
| **Visuals & Graphs** | `Recharts` & `frappe-gantt` |
| **AI Integration** | OpenRouter REST SDK & context builders |

---

## 👥 Role-Based Workspaces | بيئات العمل حسب الصلاحيات

The application maps authentication profiles dynamically using **Clerk Public Metadata** (`role: Role`):

```typescript
export enum Role {
  PROJECT_MANAGER = "PROJECT_MANAGER", // Can edit schedule, approve/reject sessions, view reports, access AI copilot
  CENTER_MANAGER = "CENTER_MANAGER",   // Access center workspace, submit logs, upload Drive links
  VIEWER = "VIEWER"                     // Read-only dashboard viewer
}
```

### 👔 Project Manager Dashboard
*   High-performance single-pass traversal query aggregator displaying operational performance.
*   Branch comparison grids, chronological delay notifications queue, recent activity streams, and Gantt charts.
*   **Approval Hub**: Manage execution submissions with interactive document inspection sidebars.

### 🏢 Center Manager Workspace
*   Conditional home dashboard redirection based on manager profile.
*   Aggregated Action Queue cards isolating immediate actions required ("Awaiting Execution", "Upload Documents", "Revisions Requested").
*   Frictionless session execution forms with inline file link validations.

---

## 🗄️ Database Schema | هيكلية قاعدة البيانات

Nano Project Managment implements a modular, split-schema Prisma setup located at `prisma/models/` for superior maintainability:

```mermaid
erDiagram
    User ||--o{ Project : owns
    User ||--o{ Center : manages
    Project ||--|{ ProjectCenter : operates_in
    Center ||--|{ ProjectCenter : operates_in
    Project ||--|{ Activity : contains
    Activity ||--|{ ActivityCenter : distributes_to
    Center ||--|{ ActivityCenter : distributes_to
    Activity ||--|{ Session : schedules
    Center ||--|{ Session : executes
    Session ||--o{ ApprovalRecord : logged_in
```

### Modular Database Files:
*   [user.prisma](file:///d:/webapps/2026/project-managment-app/prisma/models/user.prisma) — Authenticated Clerk accounts.
*   [project.prisma](file:///d:/webapps/2026/project-managment-app/prisma/models/project.prisma) — High-level planning entity.
*   [center.prisma](file:///d:/webapps/2026/project-managment-app/prisma/models/center.prisma) — Physical branch centers and `ProjectCenter` mappings.
*   [activity.prisma](file:///d:/webapps/2026/project-managment-app/prisma/models/activity.prisma) — Operational indicators (e.g. Life Skills Courses) and `ActivityCenter` targets.
*   [session.prisma](file:///d:/webapps/2026/project-managment-app/prisma/models/session.prisma) — Primary chronological execution units.
*   [approval.prisma](file:///d:/webapps/2026/project-managment-app/prisma/models/approval.prisma) — Historical audit trail of reviews.
*   [notification.prisma](file:///d:/webapps/2026/project-managment-app/prisma/models/notification.prisma) — Logged in-app announcements and alerts.

---

## 🛠️ Getting Started | دليل البدء والتشغيل

### 1. Prerequisites
Ensure you have **Node.js v20+** and a running **PostgreSQL** instance.

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/khattabAlAhmed/nano-project-managment.git
cd nano-project-managment
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and configure the following variables:
```env
# Clerk Authentication Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Database Configuration (supports SSL modes)
DATABASE_URL="postgres://username:password@db-host:5432/postgres?sslmode=require"

# OpenRouter AI Configuration
OPENROUTER_API_KEY=sk-or-v1-...
```

### 4. Database Schema Sync & Generate Client
Since Nano Project Managment uses modular, split-schema models, execute the schema builder:
```bash
# Compile split models into schema.prisma and apply schema migration
npx prisma db push
npx prisma generate
```

### 5. Running the Application Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the system.

---


## 📜 License | الترخيص

This project is open-source and licensed under the [MIT License](LICENSE). Contributions, bug reports, and pull requests are highly welcomed!

---
> Developed with passion for bilingual field management operations. 🌍✨
