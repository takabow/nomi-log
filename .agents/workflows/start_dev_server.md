---
description: Start the development server using bun
---

1. Kill existing process on port 5173 and start bun dev server
// turbo
fuser -k 5173/tcp || true && export BUN_INSTALL="$HOME/.bun" && export PATH="$BUN_INSTALL/bin:$PATH" && bun run dev --port 5173
