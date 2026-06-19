# Hermes Integration

The prototype intentionally starts with a generic command runner. Hermes integration should be added through a wrapper script, not by pointing directly at an interactive shell without guardrails.

## Target Runtime Shape

```text
POST /command
  verified signed command
      |
      v
runner.js
  writes command to stdin
      |
      v
scripts/run-hermes.sh
  selects profile, home directory, model, and tool policy
      |
      v
Hermes Agent
```

## Recommended Wrapper Responsibilities

The wrapper should:

- set `HOME` or Hermes-specific config paths to `/mnt/disks/userdata`
- select a dedicated Hermes profile for this agent
- disable or restrict high-risk tools by default
- choose a known model provider
- route logs to files that do not expose secrets
- enforce a non-interactive prompt flow
- fail closed if Hermes config is missing

Example environment:

```bash
RUNNER_MODE=hermes
HERMES_COMMAND="/app/scripts/run-hermes.sh"
DATA_DIR=/mnt/disks/userdata
```

Example wrapper sketch:

```bash
#!/usr/bin/env bash
set -euo pipefail

export HOME="${DATA_DIR:-/mnt/disks/userdata}/home"
mkdir -p "$HOME"

prompt="$(cat)"

hermes --profile eigen-agent --non-interactive "$prompt"
```

The exact Hermes CLI flags may differ by release. Verify the installed Hermes version and prefer the least-privileged mode it supports.

## State Persistence

Persist these under `/mnt/disks/userdata`:

- Hermes config
- Hermes sessions
- Hermes memories
- installed skills
- profile data
- local tool caches that are safe to retain

Do not persist:

- creator wallet private keys
- raw command signatures longer than needed
- plaintext provider credentials outside EigenCompute encrypted env handling
- broad shell history

## Tool Policy

Start with read-only scopes:

- `chat`
- `research`
- `code`
- `wallet-read`

Do not add wallet-write scopes until policy enforcement exists for:

- max spend per command
- max spend per day
- allowed chains
- allowed token contracts
- allowed destination addresses or protocols
- required human approval thresholds

## App Wallet Integration

EigenCompute provides a TEE-bound mnemonic through `MNEMONIC`. The intended custody model is:

- creator wallet signs commands
- agent derives operational wallet from `MNEMONIC`
- agent signs permitted onchain actions
- policies constrain what the agent can do

Never inject the creator wallet private key into Hermes.

## Failure Handling

The runner currently returns command status and output. A production runner should also classify:

- Hermes unavailable
- model provider unavailable
- tool denied by policy
- command rejected by Hermes safety layer
- timeout
- partial completion

These should be reflected in audit records without leaking sensitive command content.
