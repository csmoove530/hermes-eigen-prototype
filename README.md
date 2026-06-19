# Hermes Eigen Prototype

Wallet-controlled command plane for running autonomous agents inside an EigenCompute TEE.

```text
Owner wallet signs command --> TEE verifies signature --> Agent executes --> Audit record stored
```

The owner wallet never enters the runtime. It authorizes commands via EIP-712 signatures. The agent runtime uses EigenCompute's TEE-provided mnemonic as its own operational wallet.

## 60-Second Quickstart

```bash
git clone https://github.com/csmoove530/hermes-eigen-prototype.git
cd hermes-eigen-prototype
npm install
```

Start the server (mock mode, no config needed):

```bash
npm run dev
```

Verify it's running:

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "service": "hermes-eigen-controller",
  "runnerMode": "mock"
}
```

## Send Your First Signed Command

Generate a test wallet and sign a command in one step:

```bash
# Generate a throwaway key for local testing
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Derive the address and configure the server to trust it
export OWNER_ADDRESSES=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Restart the server with the owner configured
npm run dev &

# Sign and submit a command
node scripts/sign-command.js "Summarize current agent status" > /tmp/cmd.json

curl -s http://localhost:3000/command \
  -H 'content-type: application/json' \
  --data @/tmp/cmd.json | jq
```

Response:

```json
{
  "accepted": true,
  "record": {
    "id": "1718700000000-1718700000000",
    "createdAt": "2026-06-18T12:00:00.000Z",
    "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "agentId": "hermes-eigen-dev",
    "scope": "chat",
    "nonce": "1718700000000",
    "deadline": "1718700300",
    "commandHash": "41cb07af...",
    "status": "completed",
    "runnerMode": "mock"
  },
  "result": {
    "mode": "mock",
    "status": "completed",
    "output": "Accepted chat command for hermes-eigen-dev: Summarize current agent status",
    "commandHash": "41cb07af..."
  }
}
```

Replay the same command to confirm nonce protection:

```bash
curl -s http://localhost:3000/command \
  -H 'content-type: application/json' \
  --data @/tmp/cmd.json | jq
```

```json
{ "error": "nonce_replay" }
```

## How It Works

```text
                  Owner Wallet (human-held)
                         |
                   signs EIP-712
                   AgentCommand
                         |
                         v
              +---------------------+
              |   POST /command     |
              |                     |
              |  1. Validate body   |
              |  2. Check deadline  |
              |  3. Verify sig      |
              |  4. Check nonce     |
              |  5. Check scope     |
              |  6. Run command     |
              |  7. Store audit     |
              +---------------------+
                         |
                         v
               Runner (mock | hermes)
                         |
                         v
                   Audit Record
                  (command hash)
```

**Two wallets, separated by design:**

| Wallet | Held by | Purpose | Location |
|---|---|---|---|
| Owner wallet | Human / governance | Signs command intents | Never in TEE |
| Agent wallet | TEE runtime | Executes permitted actions | Derived from `MNEMONIC` inside TEE |

## Command Signature Format

Commands use [EIP-712](https://eips.ethereum.org/EIPS/eip-712) typed data:

```solidity
AgentCommand(
  string agentId,
  string command,
  string scope,
  uint256 nonce,
  uint256 deadline
)
```

Default domain (Sepolia):

```json
{
  "name": "HermesEigenController",
  "version": "1",
  "chainId": 11155111,
  "verifyingContract": "0x0000000000000000000000000000000000000001"
}
```

Set `EIP712_VERIFYING_CONTRACT` to a stable controller address for production so signatures are domain-separated from other environments.

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/status` | Controller config + recent commands |
| `GET` | `/challenge` | Fresh nonce + signing template |
| `POST` | `/command` | Submit a signed command |
| `GET` | `/attestation` | TEE attestation (placeholder) |

Full reference: [docs/api.md](docs/api.md)

## Configuration

All configuration is through environment variables. Copy the template:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `OWNER_ADDRESSES` | _(required)_ | Comma-separated EVM addresses that can sign commands |
| `AGENT_ID` | `hermes-eigen-dev` | Agent identity for EIP-712 domain separation |
| `RUNNER_MODE` | `mock` | `mock` for testing, `hermes` for real execution |
| `HERMES_COMMAND` | `hermes` | Shell command invoked in `hermes` mode |
| `HERMES_TIMEOUT_MS` | `120000` | Max execution time for Hermes commands |
| `ALLOWED_SCOPES` | `chat,research,code,wallet-read` | Permitted command scopes |
| `MAX_COMMAND_BYTES` | `4096` | Max command text size |
| `DATA_DIR` | `.data` | Persistent state directory |
| `EIP712_CHAIN_ID` | `11155111` | Chain ID for signature domain |
| `EIP712_VERIFYING_CONTRACT` | `0x...0001` | Contract address for signature domain |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `3000` | Server port |

## Runner Modes

**`mock`** — Returns a deterministic response echoing the command. Use for tests and API integration.

**`hermes`** — Invokes `HERMES_COMMAND` and writes the signed command text to stdin. Point `HERMES_COMMAND` to a wrapper script that configures the Hermes profile, model provider, tool policy, and non-interactive mode.

See [docs/hermes-integration.md](docs/hermes-integration.md).

## Repository Map

```text
.
├── src/
│   ├── server.js          # Fastify API and command authorization
│   ├── eip712.js          # EIP-712 domain, types, signature verification
│   ├── runner.js          # Mock and Hermes command runners
│   ├── store.js           # JSON state store for nonces and audit records
│   └── config.js          # Environment-driven configuration
├── scripts/
│   └── sign-command.js    # Local test signer
├── docs/
│   ├── api.md             # Full API reference
│   ├── eigencompute.md    # EigenCompute deployment guide
│   ├── hermes-integration.md  # Hermes runtime integration
│   ├── security.md        # Security architecture
│   └── threat-model.md    # Threat model and controls
├── test/
│   └── eip712.test.js     # Signature verification tests
├── Dockerfile             # linux/amd64 production image
├── ecloud.toml            # EigenCompute deployment config
└── .env.example           # Configuration template
```

## Development

```bash
npm test                    # Run test suite
npm audit --omit=dev        # Check dependency security
docker build -t hermes-eigen-prototype:local .  # Build image
```

## Deployment

See [docs/eigencompute.md](docs/eigencompute.md) for the full EigenCompute deployment guide.

Quick summary:

1. Build a `linux/amd64` Docker image
2. Configure owner addresses via encrypted env file
3. Deploy with `ecloud compute app deploy`
4. Verify image digest on the Eigen verification dashboard

## Security

This prototype is deliberately conservative:

- Rejects unsigned commands
- Never stores the creator private key
- Hashes command text in audit records (not plaintext)
- Keeps logs private by default
- Does not implement transaction execution or spend policies yet

Before using real funds, read [docs/security.md](docs/security.md) and [docs/threat-model.md](docs/threat-model.md).

## Roadmap

- [ ] Derive agent EVM account from EigenCompute `MNEMONIC`
- [ ] Onchain policy registry support
- [ ] Per-scope policy modules (wallet reads, wallet writes, research, code, publishing)
- [ ] Live Eigen attestation at `/attestation`
- [ ] Hermes wrapper with state persistence under `/mnt/disks/userdata`
- [ ] Optional x402 payment tool flow

## License

MIT
