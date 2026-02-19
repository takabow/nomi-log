---
trigger: always_on
---

# Project Rules

## Git Workflow
-   **Push Policy**: `git push` must ALWAYS be performed by the USER. The AI assistant is strictly prohibited from executing `git push` commands.
-   **Branching Strategy**: ALWAYS create a new branch for bug fixes or new features.
-   **Commit Policy**: On feature branches, `git commit` may be performed automatically. However, ONLY do this if the user has approved the implementation phase. If the user is only discussing plans or strategies, DO NOT implement or commit.
-   **Merge Policy**: Merging to `main` MUST require explicit user approval.

## Development Environment
-   **Node Manager**: Use `bun` for package management and script execution.
-   **Testing**: Use `vitest` for unit/integration testing (`bun run test`).
-   **Linting**: Use `eslint` (`bun run lint`).

## Deployment
-   **CI/CD**: GitHub Actions handles testing (`test.yml`) and deployment (`deploy.yml`) upon push to `main`.
-   **Secrets**: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` must be configured in GitHub Secrets.