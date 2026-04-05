# CodeLens — ML Code Quality Analyzer

A Next.js web app that analyzes code quality, bug risk, and complexity metrics across 18+ programming languages. Deploy instantly to Vercel — no backend required.

## Features

- **Quality Score (0–100)** — Weighted score across complexity, maintainability, style, and bug safety
- **Bug Risk (Low / Medium / High)** — Risk assessment based on multiple heuristics
- **Cyclomatic Complexity** — Decision path counting
- **Nesting Depth** — Max nesting level detection
- **Function Length Analysis** — Average + max, flags functions over 50 lines
- **Smart Insights** — Human-readable, actionable findings with severity levels
- **GitHub Integration** — Paste a repo URL to analyze up to 20 files
- **18+ Languages** — JS, TS, Python, C, C++, Java, Go, Rust, C#, Ruby, PHP, Swift, Kotlin, HTML, CSS, Bash, Lua, R

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import the repository
4. Click Deploy — no environment variables needed!

## Architecture

```
/
├── app/
│   ├── page.tsx              # Main UI
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Design tokens + animations
│   └── api/
│       ├── analyze/route.ts  # POST /api/analyze — code analysis
│       └── github/route.ts   # POST /api/github  — repo fetching
├── lib/
│   ├── analyzer.ts           # Core analysis engine
│   └── github.ts             # GitHub API utilities
```

## How the Analysis Works

The analysis engine uses **static code analysis** (not LLMs), making it:
- **Instant** — Results in milliseconds
- **Free to run** — No API costs
- **Deterministic** — Same code = same results

### Metrics computed:
| Metric | Method |
|---|---|
| Cyclomatic Complexity | Count decision points (if/else/while/for/&&/\|\|) + 1 |
| Nesting Depth | Brace counting (C-style) or indent analysis (Python) |
| Function Length | Brace-balanced parsing for all brace languages |
| Duplicate Lines | Set-based deduplication of non-trivial lines |
| Comment Ratio | Pattern matching per language |
| Magic Numbers | Regex for unexplained numeric literals |
| Error Handling | Count try/catch/except/rescue/panic/unwrap |

### Scoring weights:
- Complexity: 30%
- Maintainability: 30%
- Code Style: 20%
- Bug Safety: 20%

## Supported Languages

JavaScript, TypeScript, Python, C, C++, Java, Go, Rust, C#, Ruby, PHP, Swift, Kotlin, HTML, CSS, Bash/Shell, Lua, R

## GitHub URL Examples

- `https://github.com/vercel/next.js`
- `https://github.com/pallets/flask`
- `owner/repo` (shorthand)

> Note: Only public repositories are supported. Large repos are sampled (up to 20 files, skipping `node_modules`, `dist`, etc.)
