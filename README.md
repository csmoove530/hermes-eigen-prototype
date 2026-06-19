# Hermes Eigen Prototype

Wallet-controlled command plane for running a Hermes-style autonomous agent inside an EigenCompute TEE.

This repository is a concrete reference implementation for a simple but important pattern:

```text
creator wallet signs intent -> TEE service verifies intent -> Hermes agent acts -> agent wallet signs operational actions
```

The creator wallet never needs to be placed inside the runtime. It authorizes commands. The agent runtime can later use EigenCompute's TEE-provided mnemonic as its own operational wallet.

## Why This Exists

Autonomous agents become materially more useful when they can hold state, receive commands, pay for services, and prove what code is controlling their keys. The unsafe shortcut is to drop a human private key into a long-running server. This project takes the opposite shape:

- user-owned wallet controls the agent through signed EIP-712 commands
- the server rejects expired, replayed, unauthorized, or out-of-scope commands
- the command runner is narrow and auditable
- persistence is compatible with EigenCompute's `/mnt/disks/userdata`
- deployment is Docker-first and ready for EigenCompute's TEE model

This is not production wallet infrastructure yet. It is a clean starting point for the architecture.

## Features

- EIP-712 typed-data authorization
- multiple owner wallets via `OWNER_ADDRESSES`
- nonce replay protection per owner
- deadline checks for every command
- coarse scope policy with `ALLOWED_SCOPES`
- command-size limits
- persisted command audit records
- `mock` runner for local development
- `hermes` runner mode for invoking a Hermes wrapper command
- Dockerfile targeting `linux/amd64`
- `ecloud.toml` deployment scaffold
- API, security, EigenCompute, and Hermes integration docs

## Repository Map

```text
.
├── src/
│   ├── server.js          # Fastify API and command authorization flow
│   ├── eip712.js          # EIP-712 domain, types, signature verification
│   ├── runner.js          # mock and Hermes command runners
│   ├── store.js           # JSON state store for nonces and audit history
│   └── config.js          # environment-driven configuration
├── scripts/
│   └── sign-command.js    # local test signer
├── docs/
│   ├── api.md
│   ├── eigencompute.md
│   ├── hermes-integration.md
│   ├── security.md
│   └── threat-model.md
├── Dockerfile
├── ecloud.toml
└── test/
```

## Quick Start

Requirements:

- Node.js 22+
- npm
- an EVM private key for local testing

Install:

```bash
npm install
cp .env.example .env
```

Set `OWNER_ADDRESSES` in `.env` to the address that will sign commands.

Run the server:

```bash
npm run dev
```

Check health:

```bash
curl http://localhost:3000/health
```

## Send A Signed Command

Use a throwaway development key for local testing.

```bash
PRIVATE_KEY=0x... node scripts/sign-command.js "Summarize current agent status" > /tmp/hermes-command.json

curl -s http://localhost:3000/command \
  -H 'content-type: application/json' \
  --data @/tmp/hermes-command.json | jq
```

The response includes the recovered owner, command hash, runner mode, and result.

Reusing the same JSON body should fail with:

```json
{ "error": "nonce_replay" }
```

## Command Signature

The signed message is:

```solidity
AgentCommand(
  string agentId,
  string command,
  string scope,
  uint256 nonce,
  uint256 deadline
)
```

Default EIP-712 domain:

```json
{
  "name": "HermesEigenController",
  "version": "1",
  "chainId": 11155111,
  "verifyingContract": "0x0000000000000000000000000000000000000001"
}
```

For a real deployment, set `EIP712_VERIFYING_CONTRACT` to a stable controller or registry address so signatures are domain-separated from other environments.

## Runner Modes

`RUNNER_MODE=mock` returns a deterministic local response. Use this for tests and API integration.

`RUNNER_MODE=hermes` invokes `HERMES_COMMAND` and writes the signed command text to stdin. In a real deployment, point `HERMES_COMMAND` to a wrapper script that selects the Hermes profile, data directory, model provider, tool policy, and non-interactive execution mode.

See [docs/hermes-integration.md](docs/hermes-integration.md).

## EigenCompute Deployment

The deployment model is:

1. Build the app as a `linux/amd64` Docker image.
2. Configure owner addresses and secrets with an encrypted env file.
3. Deploy to EigenCompute.
4. Store runtime state under `/mnt/disks/userdata`.
5. Verify the release and app wallet through Eigen's verification dashboard.

See [docs/eigencompute.md](docs/eigencompute.md).

## Security Posture

This prototype is deliberately conservative:

- it does not accept unsigned commands
- it does not store or require the creator private key
- it hashes command text in the audit record
- it keeps logs private by default in `ecloud.toml`
- it does not implement transaction execution or spend policies yet

Before using real funds, add spending policies, chain allowlists, tool sandboxing, attestation wiring, and high-risk approval flows.

Read [docs/security.md](docs/security.md) and [docs/threat-model.md](docs/threat-model.md).

## Development

Run tests:

```bash
npm test
```

Audit dependencies:

```bash
npm audit --omit=dev
```

Build Docker image:

```bash
docker build -t hermes-eigen-prototype:local .
```

## Roadmap

- Derive an agent EVM account from EigenCompute `MNEMONIC`
- Add onchain policy registry support
- Add per-scope policy modules for wallet reads, wallet writes, research, code, and publishing
- Replace `/attestation` placeholder with live Eigen verification metadata
- Add a Hermes wrapper that persists `~/.hermes` under `/mnt/disks/userdata`
- Add optional x402 payment tool flow

## License

MIT
