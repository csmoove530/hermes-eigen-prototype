# Threat Model

## Security Goals

- Only configured owner wallets can issue commands
- Commands cannot be replayed
- Commands expire after a short window
- The agent never needs the creator wallet private key
- Operational funds are held by the TEE app wallet, not the creator wallet

## Non-Goals (Prototype Scope)

- Does not prove Hermes itself is safe to run with broad tools
- Does not implement spending policies
- Does not retrieve live TEE attestation quotes
- Does not make EigenCompute fully trustless (inherits alpha limitations)

## Actors

| Actor | Description |
|---|---|
| **Owner** | Wallet authorized to control the agent |
| **Operator** | Party that deploys and operates the container |
| **Agent** | Hermes runtime + command runner |
| **EigenCompute** | TEE-backed runtime and KMS |
| **External service** | Model provider, RPC, API, exchange, or x402 service |
| **Attacker** | Any party attempting to forge/replay commands, steal keys, exfiltrate data, or push unsafe actions |

## Assets

| Asset | Sensitivity |
|---|---|
| Owner wallet signing authority | Critical |
| Agent wallet private key / mnemonic | Critical |
| Model / API credentials | High |
| Signed command stream | High |
| Persistent Hermes state | Medium |
| Command audit history | Medium |
| Deployment image digest | Medium |
| User data in commands | High |

## Threat Analysis

### 1. Forged Commands

An attacker submits a command without owner authorization.

**Controls:**
- EIP-712 signature verification
- Owner address allowlist
- Typed message fields prevent signature confusion

**Residual risk:**
- Compromised owner wallet can still authorize commands
- Malicious UI could trick owner into signing a valid but dangerous command (blind signing)

---

### 2. Replay Attacks

An attacker resubmits a previously valid command.

**Controls:**
- Per-owner nonce persisted and checked before execution
- `deadline` limits signature lifetime

**Residual risk:**
- JSON file store should be replaced with stronger durable storage for high-availability deployments

---

### 3. Cross-Agent Signature Reuse

A command signed for one agent is submitted to a different agent's server.

**Controls:**
- `agentId` field in signed message
- EIP-712 domain includes `chainId` and `verifyingContract`

**Residual risk:**
- Deployments must set unique `AGENT_ID` values and stable `EIP712_VERIFYING_CONTRACT` addresses

---

### 4. Prompt Injection Into Wallet Actions

The model is manipulated into spending funds or leaking secrets.

**Controls:**
- No `wallet-write` scope implemented yet
- Coarse scope allowlist gates command categories

**Required before production:**
- Policy engine outside the model's control
- Spend simulator
- Destination/protocol allowlist
- High-risk human approval flow

---

### 5. Runtime Secret Exposure

Secrets leak through logs, shell history, process environment, or persisted files.

**Controls:**
- `.env` in `.gitignore`
- Logs private by default in `ecloud.toml`
- Audit records use command hashes, not plaintext

**Required before production:**
- Review all Hermes log output paths
- Minimize environment variable exposure
- Use EigenCompute encrypted env handling
- Never persist creator private keys

---

### 6. Malicious Upgrade

Operator deploys different code than users expect.

**Controls:**
- Docker image verified through EigenCompute release metadata
- Verifiable source deployment path documented

**Required before production:**
- Users verify image digest and release history
- Upgrade delays or owner-governed release acceptance
- Public source builds from pinned commits
