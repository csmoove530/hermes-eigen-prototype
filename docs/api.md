# API Reference

Base URL in local development:

```text
http://localhost:3000
```

## `GET /health`

Returns service health.

Example:

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "service": "hermes-eigen-controller",
  "runnerMode": "mock"
}
```

## `GET /status`

Returns public controller configuration and recent command audit records.

The response includes:

- `agentId`
- owner addresses
- allowed scopes
- EIP-712 domain and type definition
- recent command records

Example:

```bash
curl http://localhost:3000/status | jq
```

## `GET /challenge`

Returns a signing template with a fresh nonce and short deadline.

Query parameters:

- `scope`: optional command scope. Defaults to `chat`.

Example:

```bash
curl 'http://localhost:3000/challenge?scope=research' | jq
```

Response:

```json
{
  "agentId": "hermes-eigen-dev",
  "scope": "research",
  "nonce": "1781841797230",
  "deadline": "1781842097",
  "domain": {
    "name": "HermesEigenController",
    "version": "1",
    "chainId": 11155111,
    "verifyingContract": "0x0000000000000000000000000000000000000001"
  },
  "primaryType": "AgentCommand",
  "types": {
    "AgentCommand": [
      { "name": "agentId", "type": "string" },
      { "name": "command", "type": "string" },
      { "name": "scope", "type": "string" },
      { "name": "nonce", "type": "uint256" },
      { "name": "deadline", "type": "uint256" }
    ]
  }
}
```

## `POST /command`

Submits an EIP-712 signed command.

Request body:

```json
{
  "agentId": "hermes-eigen-dev",
  "command": "Summarize current agent status",
  "scope": "chat",
  "nonce": "1781841797230",
  "deadline": "1781842097",
  "signature": "0x..."
}
```

Validation:

- `agentId` must match server config.
- `scope` must be in `ALLOWED_SCOPES`.
- `command` must be smaller than `MAX_COMMAND_BYTES`.
- `deadline` must be in the future.
- `signature` must recover one configured owner address.
- `nonce` must not have been used before by that owner.

Success response:

```json
{
  "accepted": true,
  "record": {
    "id": "1781841797265-1781841797230",
    "createdAt": "2026-06-19T04:03:17.265Z",
    "owner": "0x148F1BDF74510514956d8C5d3D53A32F164d657e",
    "agentId": "hermes-eigen-dev",
    "scope": "chat",
    "nonce": "1781841797230",
    "deadline": "1781842097",
    "commandHash": "41cb07afcdb08cc740b7bbcfa1f65a58ba3755cd7a3fdfbb505e2593eece2ca3",
    "status": "completed",
    "runnerMode": "mock"
  },
  "result": {
    "mode": "mock",
    "status": "completed",
    "output": "Accepted chat command for hermes-eigen-dev: Summarize current agent status",
    "commandHash": "41cb07afcdb08cc740b7bbcfa1f65a58ba3755cd7a3fdfbb505e2593eece2ca3"
  }
}
```

Common errors:

| Status | Error | Meaning |
| --- | --- | --- |
| 400 | `invalid_body` | Request body failed schema validation |
| 400 | `wrong_agent` | Signed command targets another agent ID |
| 400 | `expired_deadline` | Signature is too old |
| 401 | `invalid_signature` | Signature did not verify against an owner |
| 403 | `scope_not_allowed` | Scope is not enabled |
| 409 | `nonce_replay` | Owner already used this nonce |
| 413 | `command_too_large` | Command exceeds configured byte limit |
| 503 | `OWNER_ADDRESSES is empty` | Server has no configured owners |

## `GET /attestation`

Placeholder endpoint for EigenCompute attestation metadata.

Current response:

```json
{
  "status": "placeholder",
  "note": "On EigenCompute, link this endpoint to ecloud verification data and TEE quote retrieval.",
  "expectedPersistentDataPath": "/mnt/disks/userdata",
  "agentId": "hermes-eigen-dev"
}
```

Production version should return:

- Eigen verification dashboard URL
- app ID
- image digest
- release ID
- app wallet address
- TEE quote or quote retrieval status
