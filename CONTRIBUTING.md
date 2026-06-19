# Contributing

This project is a reference prototype. Contributions should keep the trust boundary easy to reason about.

## Setup

```bash
git clone https://github.com/csmoove530/hermes-eigen-prototype.git
cd hermes-eigen-prototype
npm install
npm test
```

## Pull Request Expectations

- Keep changes narrowly scoped
- Add tests for signature, policy, nonce, and runner behavior
- Do not commit `.env`, private keys, generated state, or Hermes runtime data
- Prefer explicit policy checks over implicit prompt instructions
- Document any new trust assumption in the relevant `docs/` file

## Security-Sensitive Changes

Changes that affect any of these **require tests and documentation updates**:

- Signature verification
- Nonce storage
- Owner authorization
- Command execution
- Wallet derivation
- Spending policy
- Logging behavior
- Docker or EigenCompute deployment

## Areas That Need Work

- [ ] Hermes wrapper script (`scripts/run-hermes.sh`)
- [ ] EigenCompute attestation endpoint (`/attestation`)
- [ ] App wallet derivation from `MNEMONIC`
- [ ] Policy engine for `wallet-write` scopes
- [ ] Onchain policy registry
- [ ] Integration tests for command submission flow
- [ ] End-to-end tests with a real Hermes runtime

## Code Style

- ES modules (`import`/`export`)
- Node.js built-in test runner (`node --test`)
- No transpilation or build step
- Zod for request validation
- viem for EVM/EIP-712 operations
