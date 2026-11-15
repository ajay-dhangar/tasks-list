<div align="center">

# Tasks List — Modern Multi-Theme To-Do & Task Group Manager

**A sleek, zero-dependency, responsive task card and checklist management web app built with Vanilla HTML5, CSS3, and ES6+ JavaScript.**

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

[Live Demo](#-live-demo) • [Features](#-key-features) • [Themes & UI](#-multi-theme--darklight-mode) • [Getting Started](#-getting-started) • [Architecture](#-technical-architecture)

</div>

---

## Overview

**Tasks List** is a modern, productivity-focused To-Do web application designed around **grouped task cards**. Instead of a cluttered single-column list, users organize their goals into dedicated project or activity cards (e.g., *Do Code*, *Travel Checklists*, *Sprint Goals*), break each card down into step-by-step checklist items, and track real-time completion progress.

Built with pure **HTML5, CSS3, and Vanilla JavaScript**, it leverages native `<dialog>` modals, CSS custom properties for instant theme switching, and `localStorage` for offline-first data persistence—with **zero external frameworks or build tools required**.

---

## Key Features

### Card-Based Task Grouping & Step-by-Step Builder
- **Multi-Card Workspace**: Organize tasks into clean, responsive grid cards with priority badges (`High`, `Medium`, `Low`), optional descriptions, and target due dates with overdue alerts.
- **Step-by-Step Creation Modal**: Add multiple checklist steps immediately when creating a new task card using the interactive step builder inside the native `<dialog>` modal.
- **Focused Detail View**: Click any task card's title to zoom into a dedicated single-card view complete with a **← Back** navigation bar and quick **Add Item** controls.

### Real-Time Progress Tracking & Productivity Controls
- **Live Card Progress Bars**: Every card dynamically calculates and animates completion ratios (`X/Y items done` and percentage `%`).
- **Executive KPI Dashboard**: View total task lists, total action items, completed lists, and overall workspace progress at a glance.
- **Instant Search, Filter & Sort**: Filter cards by status (`All`, `In Progress`, `Completed`, `High Priority`), search across card titles and sub-items in real time, and sort by newest, progress percentage, or due date.

### Multi-Theme Engine & Dark/Light Mode
- **Dark & Light Modes**: Seamlessly toggle between high-contrast dark mode and crisp daylight mode.
- **5 Curated Color Themes**:
  1. **Midnight Gold** — Deep obsidian surface with signature golden accents.
  2. **Sunset Gradient** — Vibrant rose-to-indigo backdrop with warm card gradients.
  3. **Ocean Breeze** — Calm deep-sea blues and cyan highlights.
  4. **Emerald Forest** — Rich botanical greens for focused work.
  5. **Royal Violet** — Modern amethyst and purple tones.

### Offline Persistence & Data Portability
- **Automatic `localStorage` Sync**: All tasks, checklist items, active themes, and color modes persist automatically across browser sessions.
- **One-Click JSON Backup**: Export your entire task workspace to a timestamped `.json` file anytime.
- **Animated Empty State**: Welcomes first-time users with a floating animated badge and a **Load Demo Project** option to test features immediately.

---

## Getting Started

Because this project uses standard web technologies with zero dependencies, setup takes seconds:

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ajay-Dhangar/tasks-list-todo-app.git
   ```
2. **Navigate into the project folder**
   ```bash
   cd tasks-list-todo-app
   ```
3. **Launch the app**
   - Simply double-click `index.html` to open it in any modern browser, **or**
   - Use the **Live Server** extension in VS Code for local development.

---

## Technical Architecture

| Layer | Technology & Implementation Details |
| :--- | :--- |
| **Structure** | Semantic HTML5 (`<header>`, `<main>`, `<section>`, `<article>`, `<footer>`) and native `<dialog>` elements with `::backdrop` blur. |
| **Styling** | CSS3 Custom Properties (`[data-mode]` & `[data-theme]`), CSS Grid (`auto-fill`, `minmax()`), Flexbox, Glassmorphism (`backdrop-filter`), and `@keyframes` animations. |
| **State & Logic** | Modular ES6+ IIFE pattern with centralized state, XSS-safe HTML escaping (`escapeHtml`), event delegation, and `localStorage` serialization. |

---

## Project Structure

```text
tasks-list-todo-app/
├── index.html          # Complete self-contained application (HTML, CSS, JS)
├── README.md           # Project documentation & setup guide
└── assets/             # Optional screenshots / preview banners
```

---

## Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/Ajay-Dhangar">Ajay-Dhangar</a>
</div>
