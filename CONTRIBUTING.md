# Contributing

This project is a reference prototype. Contributions should keep the trust boundary easy to reason about.

## Development

```bash
npm install
npm test
npm audit --omit=dev
```

## Pull Request Expectations

- Keep changes narrowly scoped.
- Add tests for signature, policy, nonce, and runner behavior.
- Do not commit generated state, `.env`, private keys, or Hermes runtime data.
- Prefer explicit policy checks over implicit prompt instructions.
- Document any new trust assumption.

## Areas That Need Work

- Hermes wrapper script
- EigenCompute attestation endpoint
- app-wallet derivation from `MNEMONIC`
- policy engine for wallet-write scopes
- onchain policy registry
- integration tests around command submission

## Security-Sensitive Changes

Changes that affect any of these require tests and documentation:

- signature verification
- nonce storage
- owner authorization
- command execution
- wallet derivation
- spending policy
- logging
- Docker or EigenCompute deployment behavior
