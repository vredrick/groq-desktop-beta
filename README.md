# Groq Desktop

[![Latest Build](https://img.shields.io/github/v/release/groq/groq-desktop-beta?include_prereleases&label=latest%20build)](https://github.com/groq/groq-desktop-beta/releases/latest)

Groq Desktop features MCP server support for all function calling capable models hosted on Groq.

<img width="450" alt="Screenshot 2025-04-14 at 11 53 18 PM" src="https://github.com/user-attachments/assets/300abf8c-8b7f-4ef8-a5f9-174f93e39506" /><img width="450" alt="Screenshot 2025-04-14 at 11 53 35 PM" src="https://github.com/user-attachments/assets/61641680-5b3d-4ca9-8da4-8e84779f97bb" />

## Features

- Chat interface with image support
- Local MCP servers

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
