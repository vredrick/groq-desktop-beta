# Groq Desktop

Groq Desktop features MCP server support for all function calling capable models hosted on Groq.

## Features

- Chat interface with multi-line input
- User and assistant message alternation
- Settings page for API key configuration
- Electron-based desktop application
- Tailwind CSS for styling

## Prerequisites

- Node.js (v18+)
- pnpm package manager

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Start the development server:
   ```
   pnpm dev
   ```

## Building for Production

To build the application for production:

```
pnpm dist
```

This will create installable packages in the `release` directory.

## Configuration

In the settings page, add your Groq API key:

```json
{
  "GROQ_API_KEY": "your-api-key-here"
}
```

You can obtain a Groq API key by signing up at [https://console.groq.com](https://console.groq.com). 
