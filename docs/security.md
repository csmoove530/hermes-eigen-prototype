# Security Guide

This prototype is intentionally small so the trust boundary is easy to inspect.

## Custody Model

Two wallets, strictly separated:

```text
┌─────────────────────┐     ┌─────────────────────┐
│   Owner Wallet      │     │   Agent Wallet       │
│                     │     │                      │
│ - Held by human     │     │ - Derived from       │
│ - Signs EIP-712     │     │   TEE MNEMONIC       │
│   command intents   │     │ - Used for           │
│ - NEVER enters the  │     │   operational txns   │
│   server or TEE     │     │ - Policy-constrained │
└─────────────────────┘     └──────────────────────┘
```

Do not collapse these into one key.

## What the Prototype Enforces

| Control | How |
|---|---|
| Owner allowlist | `OWNER_ADDRESSES` checked on every command |
| Typed signatures | EIP-712 prevents ambiguous message signing |
| Agent ID separation | `agentId` field prevents cross-agent command reuse |
| Chain/contract separation | `chainId` + `verifyingContract` in EIP-712 domain |
| Replay protection | Per-owner nonce stored and checked |
| Command expiry | `deadline` field checked against server time |
| Scope restriction | `ALLOWED_SCOPES` allowlist |
| Size limits | `MAX_COMMAND_BYTES` enforced |
| Audit trail | Command hash (SHA-256) stored, not plaintext |

## What It Does Not Enforce Yet

- Transaction spend limits
- Allowed recipient/protocol lists
- Model/tool prompt-injection defenses
- Live TEE quote verification
- Onchain policy registry
- Multi-sig owner approval
- Upgrade delays
- Forced inclusion or liveness guarantees

## Hardening Checklist (Before Mainnet Funds)

1. Add explicit policy modules for each scope
2. Require extra approval for `wallet-write` scopes
3. Store policies in an append-only or onchain registry
4. Add a command simulator before execution
5. Add egress controls for Hermes tools
6. Keep logs private (`--log-visibility private`)
7. Expose Eigen verification metadata at `/attestation`
8. Pin Docker image digests for deployments
9. Add upgrade acceptance rules (delay or owner-governed)
10. Use small operational balances and refill intentionally

## Secrets

**Never commit:**

| Secret | Why |
|---|---|
| `.env` | Contains owner addresses and runtime config |
| Owner private keys | Would compromise command authority |
| Mnemonic phrases | Would compromise agent wallet |
| Provider API keys | Model/RPC access |
| Docker registry tokens | Image push access |
| Hermes auth stores | Agent session data |

Use encrypted EigenCompute env handling for runtime secrets.

## Logging

The command audit record stores a SHA-256 hash of command text, not the command itself. This prevents sensitive user intent from appearing in durable audit history.

Fastify request logs may still include endpoint metadata. Keep `--log-visibility private` on EigenCompute until every log path has been reviewed.

## Responsible Disclosure

If you find a vulnerability, open a private security advisory on GitHub or contact the repository owner directly. Do not publish exploitable details before a fix is available.
