# 🌐 **CLAUDE PROMPT: FULL-STACK WEB APP ( STUDS - CONFIGURABLE CLASSROOM SYSTEM)**

You are a **senior full-stack web developer**. Your task is to design and implement a **production-ready web application**.

You MUST follow all instructions strictly and generate outputs in structured phases. Thank youuu!

---

# ⚠️ STRICT RULES (DO NOT VIOLATE)

## ❌ DO NOT:

* Skip any required phase
* Jump ahead or merge phases
* Generate vague explanations without code
* Use fake or non-existent libraries
* Over-engineer (no microservices, no complex distributed systems)
* Mix business logic directly inside UI components
* Use flashy UI styles (no gradients, glassmorphism, etc.)

---

## ✅ MUST:

* Use:

  * HTML + CSS (or minimal Tailwind)
  * JavaScript (Vanilla or React)
  * Supabase (PostgreSQL, Auth, Storage if needed)
* Follow clean modular architecture:

  * UI Layer
  * Service Layer
  * Data Layer
* Ensure all features are **data-driven (NO hardcoding)**

---

# 🎯 PROJECT

Build a **Configurable Classroom Performance & Tracking System (Web App)**.

---

# 🌏 CONTEXT

* Philippine grading system (0–100)
* Teachers configure grading system per class
* Students log their own scores
* System computes grades dynamically
* Must support real-world usage (not demo-level)

---

# 👥 USERS

## Teacher/Admin:

* Create classes
* Define grading categories and weights
* Create activities
* Monitor and override student scores

## Student:

* Join class via class code
* Log scores
* View grade breakdown

---

# 🧩 CORE FEATURES

1. Dynamic classroom creation
2. Dynamic grading categories (NOT hardcoded)
3. Activity system
4. Student score logging
5. Attendance tracking
6. Automatic grade computation
7. Reports & analytics
8. Multi-class support

---

# 🧠 IMPORTANT DESIGN RULE

The following MUST be stored in database (NOT hardcoded):

* Categories (Quiz, Exam, etc.)
* Weights
* Activities
* Scores

---

# ⚙️ GRADE FORMULA (MUST IMPLEMENT)

Category Average:
(total score / total max score)

Weighted Score:
(category average × weight)

Final Grade:
(sum of all weighted scores)

---

# 📦 OUTPUT STRUCTURE (STRICT PHASES)

You MUST generate output in phases.
DO NOT proceed to the next phase unless instructed.

---

# 🔹 PHASE 1: SYSTEM ARCHITECTURE

Provide:

* Overall system design
* Separation:

  * Frontend
  * Backend (Supabase)
* Data flow explanation

---

# 🔹 PHASE 2: DATABASE DESIGN (SUPABASE SQL)

Provide:

* Full SQL schema
* Tables:

  * users
  * roles
  * classes
  * enrollments
  * categories
  * activities
  * scores
  * attendance
  * notifications

Requirements:

* Use foreign keys
* Use normalized structure
* Avoid redundancy

---

# 🔹 PHASE 3: BACKEND LOGIC (SUPABASE)

Provide:

* Query functions (JavaScript)
* Service layer:

  * create class
  * join class
  * create activity
  * log score
  * compute grade

---

# 🔹 PHASE 4: FRONTEND STRUCTURE

Provide:

* Folder structure
* Page structure:

  * dashboard
  * classes
  * activities
  * students
  * attendance
  * reports

---

# 🔹 PHASE 5: UI IMPLEMENTATION

Provide:

* HTML/CSS layout
* Clean admin dashboard style
* Sidebar + content layout
* Tables + modal forms

---

# 🔹 PHASE 6: BUSINESS LOGIC (FRONTEND)

Provide:

* JS logic for:

  * fetching data
  * submitting forms
  * updating UI
* Separation of concerns (services)

---

# 🔹 PHASE 7: GRADE COMPUTATION ENGINE

Provide:

* Full implementation in JavaScript
* Must compute:

  * category averages
  * weighted scores
  * final grade

---

# 🔹 PHASE 8: DATA FLOW EXAMPLE

Show step-by-step:

* Teacher creates class
* Adds category
* Adds activity
* Student logs score
* System computes grade

---

# 🔹 PHASE 9: OPTIONAL FEATURES

If included:

* Notifications
* Offline caching (localStorage)

Keep simple and realistic.

---

# ⚠️ VALIDATION RULE

If a feature cannot be implemented using:

* Supabase
* JavaScript
* HTML/CSS

👉 Simplify it
OR
👉 Mark as "Future Enhancement"

---

# 🎯 FINAL REQUIREMENT

The system must:

* Be fully configurable
* Avoid hardcoded grading logic
* Follow clean architecture
* Be realistic for production use

---

# 🚀 START NOW

Begin with **PHASE 1: SYSTEM ARCHITECTURE ONLY**.
Do NOT generate other phases yet.
