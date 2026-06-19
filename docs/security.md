# Security Guide

This repository is a prototype. It is intentionally small so the control boundary is easy to inspect.

## Custody Model

There are two different wallets:

1. Owner wallet
   - held by the human or governance system
   - signs EIP-712 command intents
   - never enters the server or TEE

2. Agent wallet
   - derived inside EigenCompute from the TEE-provided `MNEMONIC`
   - used by the agent for operational activity
   - should be policy-constrained before holding real funds

Do not collapse these into one key.

## What The Prototype Enforces

- owner allowlist
- EIP-712 typed-data signatures
- `agentId` domain separation
- `chainId` and `verifyingContract` domain separation
- per-owner nonce replay protection
- command expiry through `deadline`
- configured scope allowlist
- maximum command byte size
- command hash audit records

## What It Does Not Enforce Yet

- transaction spend limits
- allowed recipient/protocol lists
- model/tool prompt-injection defenses
- live TEE quote verification
- onchain policy registry
- multi-sig owner approval
- upgrade delays
- forced inclusion or liveness guarantees

## Recommended Hardening

Before using mainnet funds:

1. Add explicit policy modules.
2. Require extra approval for wallet-write scopes.
3. Store policies in an append-only or onchain registry.
4. Add a command simulator before execution.
5. Add egress controls for Hermes tools.
6. Keep logs private.
7. Expose Eigen verification metadata.
8. Pin Docker image digests for deployments.
9. Add upgrade acceptance rules.
10. Use small operational balances and refill intentionally.

## Secrets

Never commit:

- `.env`
- owner private keys
- mnemonic phrases
- provider API keys
- Docker registry tokens
- Hermes auth stores

Use encrypted EigenCompute env handling for runtime secrets.

## Logging

The command audit record stores a SHA-256 hash of command text, not the command itself. This avoids putting sensitive user intent into durable audit history.

Fastify request logs may still include endpoint metadata. Keep `--log-visibility private` on EigenCompute until every log path has been reviewed.

## Responsible Disclosure

If this repository is used beyond experimentation and you find a vulnerability, open a private security advisory or contact the repository owner directly. Do not publish exploitable details before a fix is available.
