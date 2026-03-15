# Contributing to PayChain

First off — thank you for taking the time to contribute. 🎉

PayChain is community-built. Every merged pull request, reported bug, and piece of documentation makes a real difference. This guide will help you understand how to contribute effectively, regardless of your skill level.

---

## Table of Contents

- [Contributing to PayChain](#contributing-to-paychain)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [How to Contribute](#how-to-contribute)
  - [Project Structure](#project-structure)
  - [Development Setup](#development-setup)
    - [Prerequisites](#prerequisites)
    - [Install Rust and Soroban CLI](#install-rust-and-soroban-cli)
    - [Clone and Install](#clone-and-install)
    - [Start Local Environment](#start-local-environment)
  - [Picking an Issue](#picking-an-issue)
    - [Good First Issues](#good-first-issues)
  - [Issue Labels](#issue-labels)
  - [Branch Naming](#branch-naming)
    - [Types](#types)
    - [Examples](#examples)
  - [Commit Message Format](#commit-message-format)
    - [Examples](#examples-1)
    - [Rules](#rules)
  - [Pull Request Process](#pull-request-process)
    - [Before Opening a PR](#before-opening-a-pr)
    - [Syncing with Main](#syncing-with-main)
    - [Opening the PR](#opening-the-pr)
    - [PR Title Format](#pr-title-format)
    - [Review Process](#review-process)
    - [What Reviewers Look For](#what-reviewers-look-for)
  - [Smart Contract Contributions](#smart-contract-contributions)
    - [File Structure](#file-structure)
    - [Guidelines](#guidelines)
    - [Build](#build)
    - [Test](#test)
  - [Backend Contributions](#backend-contributions)
    - [Guidelines](#guidelines-1)
    - [Running a Single Service](#running-a-single-service)
    - [Testing](#testing)
  - [Frontend Contributions](#frontend-contributions)
    - [Guidelines](#guidelines-2)
    - [Running Frontend](#running-frontend)
    - [Testing](#testing-1)
  - [Testing Requirements](#testing-requirements)
  - [Documentation](#documentation)
  - [Getting Help](#getting-help)
  - [Recognition](#recognition)

---

## Code of Conduct

By participating in this project, you agree to uphold our Code of Conduct:

- **Be respectful.** Disagreements happen. Debate ideas, not people.
- **Be inclusive.** Contributions from all backgrounds are welcome.
- **Be constructive.** Give feedback that helps people improve.
- **Be patient.** Maintainers are volunteers. Reviews take time.

Violations may result in a warning or removal from the project.

---

## How to Contribute

There are many ways to contribute to PayChain:

| Type | What This Means |
|---|---|
| 🐛 Bug Reports | Found something broken? Open an issue |
| 💡 Feature Requests | Have an idea? Open a discussion |
| 🔨 Code | Fix bugs, implement features from open issues |
| 📝 Documentation | Improve READMEs, add examples, fix typos |
| 🧪 Tests | Add missing tests for contracts, APIs, or UI |
| 🎨 Design | Improve the checkout UI or dashboard |

---

## Project Structure

```
paychain/
├── contracts/          ← Soroban smart contracts (Rust)
├── backend/            ← NestJS backend services (TypeScript)
├── frontend/           ← Next.js app (TypeScript)
└── docs/               ← Project documentation
```

Each directory is largely independent. You do **not** need to understand the entire codebase to contribute. Pick a module that matches your skills.

---

## Development Setup

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | >= 18 | Backend & Frontend |
| pnpm | >= 8 | Package manager |
| Rust | latest stable | Smart contracts |
| Soroban CLI | latest | Deploy & test contracts |
| Docker | >= 20 | Local database & services |
| Git | any recent | Version control |

### Install Rust and Soroban CLI

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install --locked soroban-cli
```

### Clone and Install

```bash
# Fork the repo first, then:
git clone https://github.com/<your-username>/paychain.git
cd paychain

# Add upstream remote
git remote add upstream https://github.com/your-org/paychain.git

# Install frontend dependencies
cd frontend && pnpm install && cd ..

# Install backend dependencies
cd backend && pnpm install && cd ..
```

### Start Local Environment

```bash
# Copy env file
cp .env.example .env

# Start Postgres + Redis via Docker
docker-compose up -d postgres redis

# Start backend
cd backend && pnpm start:dev

# Start frontend (separate terminal)
cd frontend && pnpm dev
```

---

## Picking an Issue

1. Browse [open issues](https://github.com/your-org/paychain/issues)
2. Look for issues labeled `good first issue` if you are new
3. Leave a comment: **"I'd like to work on this"**
4. A maintainer will assign it to you
5. **Do not submit a PR for an unassigned issue** — two people may end up doing the same work

### Good First Issues

Look for the `good first issue` label. These are small, well-scoped, and have enough context to get started without deep knowledge of the codebase.

---

## Issue Labels

| Label | Meaning |
|---|---|
| `good first issue` | Small, beginner-friendly task |
| `help wanted` | Maintainers need community help |
| `contract` | Soroban / Rust smart contract work |
| `backend` | NestJS backend service work |
| `frontend` | Next.js / React UI work |
| `bug` | Something is broken |
| `enhancement` | New feature or improvement |
| `documentation` | Docs only change |
| `testing` | Adding or improving tests |
| `blocked` | Waiting on another issue |
| `in progress` | Someone is actively working on this |
| `review needed` | PR is open and needs a review |

---

## Branch Naming

Use this format for your branch names:

```
<type>/<short-description>
```

### Types

| Type | When to Use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `refactor` | Code restructure, no behavior change |
| `chore` | Tooling, config, dependencies |
| `contract` | Smart contract work |

### Examples

```
feat/escrow-contract-logic
fix/payment-status-webhook
docs/add-soroban-deploy-guide
test/merchant-vault-unit-tests
contract/payment-split-initial
```

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard.

```
<type>(scope): <short description>

[optional body]

[optional footer]
```

### Examples

```
feat(contracts): implement escrow deposit function

Add create_escrow and deposit functions to escrow_contract.
Funds are locked until buyer approves or timeout occurs.

Closes #12
```

```
fix(backend): payment status not updating on webhook retry

The webhook retry worker was not re-fetching payment state.
Fixed by querying payment_service before sending webhook.

Fixes #47
```

```
docs(frontend): add checkout integration example to README
```

### Rules

- Use present tense: "add feature" not "added feature"
- Keep subject line under 72 characters
- Reference the issue number in the footer: `Closes #<number>`
- Separate subject from body with a blank line

---

## Pull Request Process

### Before Opening a PR

- [ ] Your branch is up to date with `main`
- [ ] All tests pass locally
- [ ] You've added tests for new functionality
- [ ] You've updated relevant documentation
- [ ] Your code follows the style conventions of the module

### Syncing with Main

```bash
git fetch upstream
git rebase upstream/main
```

### Opening the PR

1. Push your branch: `git push origin feat/your-feature`
2. Open a Pull Request against `main`
3. Fill in the PR template completely
4. Link the issue: "Closes #<number>"
5. Request a review if needed

### PR Title Format

Same as commit format:

```
feat(contracts): implement payment split contract
fix(backend): correct conversion rate calculation
docs: update README with deployment steps
```

### Review Process

- All PRs need at least **1 maintainer approval**
- Complex contract PRs need **2 approvals**
- Respond to review feedback within 7 days or the PR may be closed
- Maintainers may push small cleanup commits to your branch before merging

### What Reviewers Look For

- Does the code do what the issue describes?
- Are there tests?
- Is there any security risk?
- Is the code readable and consistent with the rest of the module?

---

## Smart Contract Contributions

Smart contracts live in `contracts/`. Each is a standalone Rust crate.

### File Structure

```
contracts/<contract_name>/
├── src/
│   ├── lib.rs        ← contract entry point and public functions
│   ├── types.rs      ← data structures and enums
│   ├── storage.rs    ← state read/write helpers
│   └── logic.rs      ← business logic
└── Cargo.toml
```

### Guidelines

- One contract = one responsibility. Do not add unrelated logic to an existing contract.
- Keep functions small. Extract helpers into `logic.rs`.
- Define all data types in `types.rs`.
- All storage reads/writes go through `storage.rs` — never raw instance storage access in `lib.rs`.
- Every public function must have a corresponding unit test.
- Use Soroban SDK events for any state-changing operations.

### Build

```bash
cd contracts/<contract_name>
cargo build --target wasm32-unknown-unknown --release
```

### Test

```bash
cd contracts/<contract_name>
cargo test
```

---

## Backend Contributions

Backend services live in `backend/`. The stack is **NestJS + TypeScript**.

### Guidelines

- Each service is independent. Do not import directly from another service — use the API gateway.
- Use `class-validator` for all request DTOs.
- All database queries go through repository classes. No raw SQL in controllers or services.
- Errors must be thrown using NestJS `HttpException` or custom exception classes.
- Every endpoint needs a corresponding unit test in `*.spec.ts`.
- Async functions must handle errors — use `try/catch` and propagate properly.

### Running a Single Service

```bash
cd backend/payment_service
pnpm start:dev
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

---

## Frontend Contributions

Frontend lives in `frontend/`. Stack is **Next.js 14 + TypeScript + Tailwind CSS**.

### Guidelines

- Components go in `components/`. Pages go in `app/`.
- Shared logic goes in `hooks/` as custom React hooks.
- API calls are centralized in `services/`. Do not call `fetch` directly in components.
- Use Tailwind utility classes only — no inline styles.
- Components must be accessible: use semantic HTML and ARIA attributes where needed.
- Every component should handle loading, error, and empty states.

### Running Frontend

```bash
cd frontend
npm dev
```

### Testing

```bash
npm test
```

---

## Testing Requirements

| Area | Minimum Requirement |
|---|---|
| Smart Contracts | Unit tests for every public function |
| Backend Services | Unit tests for service layer; e2e for critical flows |
| Frontend | Component tests for interactive components |
| APIs | Integration tests for all endpoints |

PRs without tests for new functionality will not be merged.

---

## Documentation

Good documentation is as valuable as code.

- Update the relevant `README.md` if your change affects setup or usage
- Add inline code comments for complex logic — especially in contracts
- If you add a new API endpoint, document it in `docs/api.md`
- If you add a new contract function, add it to `docs/contracts.md`

---

## Getting Help

Stuck? Need clarification on an issue?

- **Comment on the issue** — maintainers check regularly
- **Open a Discussion** — for questions that don't fit an issue
- **Tag a maintainer** in your PR if it's been sitting without a review for more than 5 days

We want contributors to succeed. Don't hesitate to ask.

---

## Recognition

All contributors are recognized in:

- The `CONTRIBUTORS.md` file (added automatically on first merged PR)
- Release notes for the version their work ships in

Thank you for building PayChain. 🚀