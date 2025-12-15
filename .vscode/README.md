# VSCode Workspace Configuration

This directory contains VSCode workspace settings to improve the development experience for all contributors.

## Files

### `settings.json`
Workspace settings that:
- Configure **Biome** as the default formatter
- Enable **format on save** and **organize imports on save**
- Disable conflicting formatters (Prettier, ESLint)
- Set up TypeScript to use the workspace version

### `extensions.json`
Recommended VSCode extensions:
- **Biome** (`biomejs.biome`) - Fast linter and formatter
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) - For future styling
- Marks **Prettier** as unwanted to avoid conflicts

### `launch.json`
Debug configurations:
- **Debug Server** - Debug the Bun backend with breakpoints
- **Debug Frontend** - Debug the React app in Chrome
- **Debug Full Stack** - Debug both simultaneously

### `tasks.json`
Quick access tasks (Cmd/Ctrl + Shift + P → "Tasks: Run Task"):
- **Dev: Start All** - Run both frontend and backend
- **Dev: Server Only** - Run backend only
- **Dev: Frontend Only** - Run frontend only
- **DB: Generate Migration** - Generate Drizzle migrations
- **DB: Run Migration** - Apply migrations
- **DB: Studio** - Open Drizzle Studio
- **Lint: Check** - Run Biome linter
- **Lint: Fix** - Auto-fix linting issues
- **TypeScript Check** - Run TypeScript type checking
- **Build All** - Build all apps

## Getting Started

1. Install recommended extensions when prompted
2. Reload VSCode if needed
3. Files will automatically format on save using Biome
4. Use `Cmd/Ctrl + Shift + B` to run the default build task
5. Press `F5` to start debugging

## Note

These settings are committed to the repository to ensure consistent formatting and tooling across all contributors.
