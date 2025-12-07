# Recipe Platform

A git-backed recipe platform built with Astro, Netlify Functions, and MCP tools.

## Features

- **Recipes as Markdown**: YAML frontmatter + Markdown body
- **Git as source of truth**: No database, direct commits via GitHub API
- **Beautiful UI**: Clean, responsive design with Tailwind CSS
- **Admin Interface**: Create, edit, and manage recipes
- **MCP Tools**: AI agent integration for recipe management
- **Tag System**: Organize recipes by categories

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
recipes/
├── content/recipes/          # Recipe markdown files
│   └── <slug>/index.md
├── src/
│   ├── components/           # UI components
│   ├── layouts/              # Page layouts
│   ├── lib/                  # Core utilities
│   ├── pages/                # Routes
│   └── types/                # TypeScript types
├── netlify/functions/        # API endpoints
└── mcp/                      # MCP server
```

## Recipe Format

Recipes are stored as Markdown files with YAML frontmatter:

```yaml
---
title: "Recipe Title"
description: "Short description"
servings: 4
tags: ["dinner", "vegetarian"]

times:
  prep_minutes: 15
  cook_minutes: 45

ingredients:
  - item: "flour"
    amount: "2 cups"
    note: "sifted"

instructions:
  - "Step one"
  - "Step two"

notes: "Optional tips"
created_at: "2024-01-15"
updated_at: "2024-01-15"
---

Optional markdown body for longer notes.
```

## Environment Variables

### Netlify (set in dashboard)

| Variable | Description |
|----------|-------------|
| `GIT_REPO_OWNER` | GitHub username/org |
| `GIT_REPO_NAME` | Repository name |
| `GIT_DEFAULT_BRANCH` | Branch name (default: main) |
| `GIT_PAT` | GitHub Personal Access Token |
| `RECIPE_AGENT_API_TOKEN` | API token for MCP/agents |

### MCP Server (local `.env`)

| Variable | Description |
|----------|-------------|
| `RECIPE_API_BASE_URL` | Your deployed API URL |
| `RECIPE_API_TOKEN` | Same as RECIPE_AGENT_API_TOKEN |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/get-recipe?slug=X` | GET | No | Get single recipe |
| `/api/search-recipes` | GET | No | Search recipes |
| `/api/list-tags` | GET | No | Get all tags |
| `/api/create-recipe` | POST | Yes | Create recipe |
| `/api/update-recipe` | PUT | Yes | Update recipe |
| `/api/create-variation` | POST | Yes | Create variation |
| `/api/commit-recipes` | POST | Yes | Commit to git |

## MCP Server

The MCP server provides AI agents with recipe management capabilities.

### Setup

1. Build the server:
   ```bash
   npm run mcp:build
   ```

2. Create `.env` in project root:
   ```
   RECIPE_API_BASE_URL=https://your-site.netlify.app/api
   RECIPE_API_TOKEN=your-token
   ```

3. Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "recipes": {
         "command": "node",
         "args": ["/path/to/recipes/mcp/dist/server.js"]
       }
     }
   }
   ```

### Available Tools

- `search_recipes` - Search by query or tag
- `get_recipe` - Get recipe details
- `create_recipe` - Create new recipe
- `update_recipe` - Update existing recipe
- `create_variation` - Create recipe variation
- `list_tags` - Get all tags
- `commit_changes` - Commit to git

## Admin UI

Access `/admin` to manage recipes. Authentication via Netlify Identity.

### Setup Netlify Identity

1. Enable Identity in Netlify dashboard
2. Invite yourself as a user
3. Accept invitation email
4. Log in at `/admin`

## Deployment

1. Push to GitHub
2. Connect repository to Netlify
3. Set environment variables
4. Enable Netlify Identity
5. Deploy!

## License

MIT
