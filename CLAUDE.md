# GROQ Desktop App - Development Guide

## Build & Development Commands
- `pnpm dev` - Start development environment (both Vite and Electron)
- `pnpm build` - Build the React/Vite frontend
- `pnpm build:electron` - Build the Electron app
- `pnpm dist` - Full build for distribution (frontend + Electron)

## Code Style Guidelines
- **React**: Functional components with hooks (useState, useEffect, useRef)
- **Imports**: Group React imports first, then third-party, then local
- **Formatting**: 2-space indentation, semicolons required
- **Error Handling**: Use try/catch blocks with console.error logging
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Component Structure**: Props destructuring at function start, grouped state declarations
- **Styling**: TailwindCSS for all styling - no custom CSS files

## Project Architecture
- Electron app with React frontend using Vite
- Main process in `electron/main.js`, renderer in `src/renderer/`
- Communication via IPC between main and renderer processes
- Integrates with Groq API and Model Context Protocol (MCP)