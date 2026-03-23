---
inclusion: fileMatch
fileMatchPattern: "src/frontend/**,agents.md,_extras/frontend-prompts/**,README.md"
---

# Frontend & Docs

- Frontend is plain HTML/CSS/JS served from `src/frontend/`. No frameworks, no build tools.
- `src/frontend/components/` directory for reusable UI components (e.g., navbar, card, modal). Each component is a JS file exporting a DOM-building function.
- `agents.md` is written as direct instructions to an AI, not human documentation.
- Prompt templates in `_extras/frontend-prompts/` reference the project structure so AI output fits the template patterns.
