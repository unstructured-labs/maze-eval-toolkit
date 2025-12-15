# LMIQ v1 Beta

AI Maze Solving Benchmark - Test LLM spatial reasoning by evaluating their ability to navigate mazes.

## Overview

LMIQ v1 Beta is a benchmark for evaluating AI models on maze-solving tasks. It includes:

- **Maze Generation**: Procedurally generated mazes using DFS algorithm with configurable difficulty
- **Evaluation CLI**: Test models via OpenRouter with concurrent request support
- **Results Storage**: SQLite database for comprehensive evaluation metrics
- **Viewer UI**: React app to browse mazes and replay AI solutions

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [Task](https://taskfile.dev/) (optional, for convenience commands)
- OpenRouter API key (for evaluations)

### Installation

```bash
git clone https://github.com/your-org/lmiq-v1-beta
cd lmiq-v1-beta
bun install
```

### Generate a Test Set

```bash
task generate -- --count 10 --output ./data/test-v1.json
# Or without Task:
bun run src/cli/index.ts generate --count 10 --output ./data/test-v1.json
```

### Run an Evaluation

```bash
export OPENROUTER_API_KEY="your-api-key"
task evaluate -- \
  --test-set ./data/test-v1.json \
  --model "anthropic/claude-3.5-sonnet" \
  --concurrency 5 \
  --output ./results/eval.db
```

### View Results

```bash
task ui
# Open http://localhost:5173
```

## Difficulty Levels

| Difficulty | Grid Size     | Min Path | Extra Paths |
|------------|---------------|----------|-------------|
| simple     | 5-8 × 4-6     | 5        | 0           |
| easy       | 8-12 × 6-9    | 10       | 6           |
| medium     | 12-18 × 10-14 | 20       | 10          |
| hard       | 16-22 × 12-16 | 30       | 15          |
| nightmare  | 28-38 × 18-22 | 50       | 0           |

## CLI Commands

### Generate

```bash
task generate -- [options]

Options:
  -n, --count <n>           Mazes per difficulty (default: 10)
  -d, --difficulties <list> Comma-separated (default: simple,easy,medium,hard,nightmare)
  -o, --output <path>       Output JSON file (default: ./data/test-set.json)
  --name <name>             Test set name
```

### Evaluate

```bash
task evaluate -- [options]

Options:
  -t, --test-set <path>    Path to test set JSON (required)
  -m, --model <model>      OpenRouter model ID (required)
  -c, --concurrency <n>    Concurrent requests (default: 5)
  -o, --output <path>      SQLite database path (default: ./results/eval.db)
  -f, --formats <list>     Prompt formats (default: ascii,matrix2d)
  -k, --api-key <key>      OpenRouter API key (or set OPENROUTER_API_KEY)
  --dry-run                Parse test set without API calls
  --limit <n>              Limit number of mazes to evaluate
```

### Prompt Formats

- `ascii` - Visual grid with walls and markers
- `adjacency` - Graph format showing cell connections
- `coordmatrix` - Dense matrix with move notation
- `matrix2d` - Grid + explicit valid moves per cell

Combine multiple: `--formats ascii,matrix2d,adjacency`

## Evaluation Metrics

Each evaluation records:

- **Tokens**: Input, output, reasoning tokens
- **Cost**: USD cost from OpenRouter
- **Timing**: Total inference time in ms
- **Response**: Full raw response + parsed moves
- **Outcome**: success, failure, parse_error, invalid_move
- **Efficiency**: Ratio of shortest path to actual path taken

## Project Structure

```
lmiq-v1-beta/
├── src/
│   ├── core/           # Maze generation, solving, rendering
│   ├── cli/            # CLI commands (generate, evaluate)
│   ├── db/             # SQLite database layer
│   ├── llm/            # OpenRouter integration
│   └── ui/             # React viewer app
├── data/               # Generated test sets (gitignored)
└── results/            # Evaluation databases (gitignored)
```

## Development

```bash
# Format code
task format

# Lint code
task lint

# Type check
task tsc

# Run all checks
task check
```

## License

MIT
