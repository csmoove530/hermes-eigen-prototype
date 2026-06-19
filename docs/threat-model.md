# Threat Model

## Goals

- Only configured owner wallets can issue commands.
- Commands cannot be replayed.
- Commands expire.
- The agent never needs the creator wallet private key.
- Operational agent funds should be held by the EigenCompute app wallet, not by the creator wallet.

## Non-Goals

- This prototype does not prove Hermes itself is safe to run with broad tools.
- This prototype does not implement spending policies yet.
- This prototype does not retrieve live TEE attestation quotes yet.
- This prototype does not make EigenCompute fully trustless; it inherits EigenCompute alpha limitations.

## Main Controls

- EIP-712 typed data avoids ambiguous signatures.
- `agentId` prevents cross-agent command reuse.
- `scope` allows coarse policy gates.
- `nonce` prevents replay.
- `deadline` limits signature lifetime.
- command hashes are stored instead of full command text in the audit record.

## Risks To Close Before Mainnet Funds

- Add chain/protocol/spend policy enforcement before enabling wallet writes.
- Add human confirmation flow for high-risk scopes.
- Run Hermes with limited tool permissions and restricted network access.
- Keep logs private by default.
- Wire `/attestation` to EigenCompute verification data.

## Actors

- Owner: wallet authorized to control the agent.
- Operator: party that deploys or operates the container.
- Agent: Hermes runtime plus command runner.
- EigenCompute environment: TEE-backed runtime and KMS.
- External service: model provider, RPC provider, API, exchange, or x402 service.
- Attacker: any party trying to forge commands, replay commands, steal keys, exfiltrate data, or push unsafe actions through the agent.

## Assets

- owner wallet signing authority
- agent wallet private key or mnemonic
- model/API credentials
- signed command stream
- persistent Hermes state
- command audit history
- deployment image digest
- user data passed into commands

## Primary Threats

### Forged Commands

An attacker submits a command without owner authorization.

Current controls:

- EIP-712 signature verification
- owner allowlist
- typed message fields

Residual risk:

- compromised owner wallet can still authorize commands
- malicious UI could trick owner into signing a valid but dangerous command

### Replay

An attacker resubmits an old valid command.

Current controls:

- nonce is persisted per owner
- deadline limits signature lifetime

Residual risk:

- JSON store is simple and should be replaced with stronger durable storage for high availability

### Cross-Agent Signature Reuse

A command signed for one agent is submitted to another.

Current controls:

- `agentId`
- EIP-712 domain `chainId`
- EIP-712 domain `verifyingContract`

Residual risk:

- deployments should set unique agent IDs and stable verifying contract values

### Prompt Injection Into Wallet Actions

The model is convinced to spend funds or leak secrets.

Current controls:

- no wallet-write scope is implemented yet
- coarse scope allowlist

Required before production:

- policy engine outside the model
- spend simulator
- destination/protocol allowlist
- high-risk approval flow

### Runtime Secret Exposure

Secrets leak through logs, shell history, process environment, or persisted files.

Current controls:

- `.env` ignored
- logs private by default in `ecloud.toml`
- command audit records use command hashes

Required before production:

- review Hermes logs
- minimize environment exposure
- use EigenCompute encrypted env handling
- never persist creator private keys

### Malicious Upgrade

Operator deploys different code than users expect.

Current controls:

- Docker image can be verified through EigenCompute release metadata
- verifiable source deployment path is documented

Required before production:

- users verify image digest and release history
- upgrade delays or owner-governed release acceptance
- public source builds from pinned commits
