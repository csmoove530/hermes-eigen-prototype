# Security Policy

## Supported Versions

This repository is an early prototype. Only the latest commit on `main` is supported.

## Reporting a Vulnerability

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/csmoove530/hermes-eigen-prototype/security/advisories/new), or contact the repository owner directly.

**Include:**

- Affected commit hash
- Reproduction steps
- Expected impact
- Whether secrets, funds, or command authorization can be compromised

**Do not include** live private keys, seed phrases, provider credentials, or user data.

## Prototype Limitations

This prototype does not yet implement:

| Missing Control | Risk |
|---|---|
| Spend policy engine | No limits on wallet-write actions |
| Live TEE attestation | Cannot cryptographically verify runtime |
| Hermes sandbox policy | Agent tools are not restricted |
| Wallet-write execution | No onchain transaction path |
| Multi-sig approval | Single owner signature is sufficient |

**Do not use this prototype with real funds or mainnet balances without additional hardening.**

See [docs/security.md](docs/security.md) and [docs/threat-model.md](docs/threat-model.md) for the full security architecture.
