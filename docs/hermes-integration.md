# Hermes Integration

The prototype starts with a generic command runner. Hermes integration is added through a wrapper script — never by pointing directly at an interactive shell.

## How the Runner Works

```text
POST /command
  │
  ├── Signature verified
  ├── Nonce checked
  ├── Scope validated
  │
  └── runner.js
        │
        ├── RUNNER_MODE=mock  →  Returns deterministic echo response
        │
        └── RUNNER_MODE=hermes  →  Spawns HERMES_COMMAND
              │
              ├── Writes command text to stdin
              ├── Sets env: HERMES_AGENT_ID, HERMES_COMMAND_OWNER, HERMES_COMMAND_SCOPE
              ├── Captures stdout/stderr
              └── Enforces HERMES_TIMEOUT_MS
```

## Configuration

```bash
RUNNER_MODE=hermes
HERMES_COMMAND="/app/scripts/run-hermes.sh"
HERMES_TIMEOUT_MS=120000
DATA_DIR=/mnt/disks/userdata
```

## Writing a Wrapper Script

The wrapper script is responsible for configuring Hermes before execution.

**Requirements:**

- Set `HOME` or config paths to persistent storage
- Select a dedicated Hermes profile
- Disable or restrict high-risk tools
- Choose a known model provider
- Route logs to files (not stdout with secrets)
- Use non-interactive prompt mode
- Fail closed if config is missing

**Example: `scripts/run-hermes.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

export HOME="${DATA_DIR:-/mnt/disks/userdata}/home"
mkdir -p "$HOME"

# Read command text from stdin
prompt="$(cat)"

# Run Hermes non-interactively with a restricted profile
hermes --profile eigen-agent --non-interactive "$prompt"
```

The exact Hermes CLI flags may differ by release. Verify the installed version and prefer the least-privileged mode available.

## State Persistence

**Persist under `/mnt/disks/userdata`:**

- Hermes config and profiles
- Session history
- Agent memories
- Installed skills
- Local tool caches

**Never persist:**

- Creator wallet private keys
- Raw command signatures
- Plaintext provider credentials (use EigenCompute encrypted env)
- Broad shell history

## Scope Policy

Start with read-only scopes:

| Scope | Risk | Status |
|---|---|---|
| `chat` | Low | Enabled by default |
| `research` | Low | Enabled by default |
| `code` | Low | Enabled by default |
| `wallet-read` | Low | Enabled by default |
| `wallet-write` | High | Do not enable yet |

**Before enabling `wallet-write`, implement:**

- Max spend per command
- Max spend per day
- Allowed chains
- Allowed token contracts
- Allowed destination addresses/protocols
- Human approval thresholds

## App Wallet Model

EigenCompute provides a TEE-bound mnemonic through the `MNEMONIC` environment variable.

```text
Owner Wallet                    Agent Wallet
(human-held)                    (TEE-derived)
     │                               │
     │  signs EIP-712 commands       │  signs permitted onchain actions
     │                               │
     └──────── policies ─────────────┘
               constrain what
               the agent can do
```

**Never inject the creator wallet private key into Hermes.**

## Failure Classification

A production runner should classify failures for audit records:

| Failure | Audit Status | Action |
|---|---|---|
| Hermes unavailable | `failed` | Check Hermes installation |
| Model provider unavailable | `failed` | Check API credentials |
| Tool denied by policy | `denied` | Review tool permissions |
| Rejected by Hermes safety | `rejected` | Review command content |
| Timeout | `timeout` | Increase `HERMES_TIMEOUT_MS` or simplify command |
| Partial completion | `partial` | Check output for usable results |

Audit records should reflect status without leaking sensitive command content.
