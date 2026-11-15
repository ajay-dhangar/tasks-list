# TaskFlow v2.0

A modern, responsive and installable task management application built with HTML, CSS and Vanilla JavaScript.

## Features

- Create, edit and delete tasks.
- Organize tasks by category.
- Add and manage checklist items.
- Mark tasks as completed.
- Automatic task progress calculation.
- Dashboard statistics.
- Dark and light modes.
- Ocean, Forest and Sunset themes.
- Search and filter tasks.
- Sort tasks by priority, date and title.
- Due dates and overdue indicators.
- LocalStorage persistence.
- JSON backup and restore.
- Responsive mobile navigation.
- PWA installation.
- Offline application shell.
- Keyboard shortcuts.

## Project Structure

```text
taskflow-v2/
├── index.html
├── manifest.webmanifest
├── sw.js
├── README.md
├── assets/
│   └── icon.svg
├── css/
│   └── style.css
└── js/
    └── app.js
```

## Getting Started

### Option 1: VS Code Live Server

1. Open the project folder in VS Code.
2. Install the Live Server extension.
3. Right-click index.html.
4. Select Open with Live Server.

### Option 2: Python Development Server

Run:

```bash
python -m http.server 5500
```

Open:

```text
http://localhost:5500
```

### Option 3: Node.js

```bash
npx serve .
```

## Storage

TaskFlow uses browser LocalStorage.

Storage keys:

- taskflow_v2_data
- taskflow_v2_settings

Data remains in the current browser's storage.

Use Export Data to create a JSON backup.

## PWA

The application includes:

- manifest.webmanifest
- sw.js
- assets/icon.svg

For PWA installation, serve the application through HTTPS
or localhost.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + K | Focus search |
| Cmd + K | Focus search |
| N | Create new task |
| Escape | Close mobile sidebar |

## Technology Stack

- HTML5
- CSS3
- Vanilla JavaScript
- LocalStorage
- Web App Manifest
- Service Workers
- Lucide Icons

## Developer

Ajay Dhangar

GitHub:
https://github.com/ajay-dhangar

Portfolio:
https://ajay-dhangar.github.io/

## License

MIT License
