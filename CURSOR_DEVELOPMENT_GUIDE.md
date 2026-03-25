# Cursor IDE Development Guide & AI Strategy

This document outlines the optimal development workflow for the Automotive Supply Chain pipeline and dashboard using Cursor IDE, Claude, and the Model Context Protocol (MCP).

## 1. Project Organization & Standards

We've organized the repository into a standard layout to make it easier for AI and human developers to navigate:
- `src/`: All Python source code.
- `data/`: All JSON inputs, Excel outputs, and configuration maps.
- `docs/`: Markdown documentation and meeting notes.
- `gm-supplier-dashboard/`: React SPA with its own Bun-based toolchain.

**Always adhere to the standards defined in `.cursor/rules/`:**
- `python-standards.mdc`: For all Python backend work.
- `react-standards.mdc`: For all frontend dashboard work.
- `prompting-standards.mdc`: For interacting with AI models in Cursor.

---

## 2. Optimizing AI Workflows in Cursor

### Mastering Context with `@` Mentions
The single most important factor for high-quality AI code generation is providing the right context.
*   **`@Files`:** Use this for 90% of your edits. Explicitly mention the file you're working on and any relevant dependency files (e.g., `@src/fetch_all_quarterly.py` and `@data/ticker_source_map.json`).
*   **`@Folders`:** Perfect for when you need the AI to understand the structure of a module or find examples of existing patterns (e.g., `"Follow the same pattern as files in @src/tools/"`).
*   **`@Docs`:** Add official documentation links for `FastAPI`, `Pandas`, `Tailwind CSS`, or `React-Three-Fiber`. This ensures the AI uses the latest APIs.

### The Plan-First Workflow
For any task that spans multiple files or involves a complex architectural shift:
1.  **Ask for a Plan:** *"Draft a step-by-step plan for adding a new 'Operating Margin' KPI to both the Python pipeline and the React dashboard."*
2.  **Review & Refine:** Correct the plan if the AI misses a data mapping step or uses an incorrect file path.
3.  **Execute:** Once the plan is solid, use **Composer** (`Cmd + I`) or **Agent Mode** to implement the changes.

### Model Selection Strategy
- **Claude 3.5 Sonnet (Workhorse):** Best for multi-file refactors, complex UI building, and strict adherence to project standards. This should be your default for almost all tasks.
- **GPT-4o (Specialist):** Excellent for deep architectural analysis, complex mathematical or algorithmic debugging, or when Claude is stuck in a hallucination loop.
- **Cursor-Small / Haiku (Efficiency):** Ideal for rapid inline autocomplete (`Tab`), generating boilerplate code, and asking quick single-file questions.

---

## 3. Model Context Protocol (MCP) Setup

MCP allows Cursor to connect to external tools and databases directly through the AI.

### Configuration
You can add MCP servers globally in **Cursor Settings > Features > MCP Servers** or per-project in a `.cursor/mcp.json` file.

### Recommended MCP Servers for this Project
| Server Name | Command/Type | Use Case |
| :--- | :--- | :--- |
| **Google Search** | `npx -y @modelcontextprotocol/server-google-search` | Fetch the latest SEC filing URLs or Yahoo Finance ticker symbols. |
| **Local File System** | `builtin` | Allows the AI to read/write files and browse the repo (enabled by default). |
| **GitHub** | `npx -y @modelcontextprotocol/server-github` | Manage GitHub issues and pull requests from within the Cursor chat. |
| **PostgreSQL** | `npx -y @modelcontextprotocol/server-postgres` | (Future) Query the database if the project moves away from static JSON files. |

---

## 4. Ideas for Repository Expansion

### Data & Backend
1.  **Database Migration:** Move from static JSON files to a local **SQLite** or **PostgreSQL** database. This would allow for better data versioning and more complex queries.
2.  **Automated Web Scrapers:** Use an MCP server with `Playwright` to automatically scrape investor relations pages for companies not found on SEC/Yahoo Finance.
3.  **PDF Generation:** Create a Python script using `ReportLab` or `WeasyPrint` to generate automated supplier risk reports in PDF format from the dashboard data.

### Dashboard & Frontend
1.  **New 3D Vehicle Models:** Expand the 3D map from the Tahoe to other GM models (e.g., Silverado, Hummer EV). The pipeline is already profile-driven in `src/models/index.ts`.
2.  **Real-time Stock Tickers:** Add a small real-time stock price widget for each public supplier using a financial API (e.g., Alpha Vantage or Polygon.io).
3.  **Comparison Tools:** Implement a "Supplier vs. Benchmark" view where users can see a supplier's KPIs directly overlaid against the Tier 1 average in a radar chart.
