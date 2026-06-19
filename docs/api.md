# API Reference

Base URL:

```
http://localhost:3000
```

---

## `GET /health`

Returns service health. Use this to verify the server is running.

**Request:**

```bash
curl http://localhost:3000/health
```

**Response `200`:**

```json
{
  "status": "ok",
  "service": "hermes-eigen-controller",
  "runnerMode": "mock"
}
```

---

## `GET /status`

Returns controller configuration, EIP-712 signing parameters, and recent command audit records. Use this to inspect the current agent setup and verify your signing parameters before submitting commands.

**Request:**

```bash
curl http://localhost:3000/status | jq
```

**Response `200`:**

```json
{
  "agentId": "hermes-eigen-dev",
  "owners": [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  ],
  "allowedScopes": ["chat", "research", "code", "wallet-read"],
  "eip712": {
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
  },
  "recentCommands": [
    {
      "id": "1718700000000-1718700000000",
      "createdAt": "2026-06-18T12:00:00.000Z",
      "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "agentId": "hermes-eigen-dev",
      "scope": "chat",
      "nonce": "1718700000000",
      "deadline": "1718700300",
      "commandHash": "41cb07afcdb08cc740b7bb...",
      "status": "completed",
      "runnerMode": "mock"
    }
  ]
}
```

---

## `GET /challenge`

Returns a signing template with a fresh nonce and 5-minute deadline. Use this to get the correct values before signing a command.

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `scope` | string | `chat` | Command scope to include in the template |

**Request:**

```bash
curl 'http://localhost:3000/challenge?scope=research' | jq
```

**Response `200`:**

```json
{
  "agentId": "hermes-eigen-dev",
  "scope": "research",
  "nonce": "1718700000000",
  "deadline": "1718700300",
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

**Signing flow:**

1. Call `/challenge` to get a nonce and deadline
2. Fill in `command` text
3. Sign the typed data with your owner wallet
4. Submit to `POST /command`

---

## `POST /command`

Submits an EIP-712 signed command for execution.

**Request body:**

```json
{
  "agentId": "hermes-eigen-dev",
  "command": "Summarize current agent status",
  "scope": "chat",
  "nonce": "1718700000000",
  "deadline": "1718700300",
  "signature": "0x..."
}
```

| Field | Type | Description |
|---|---|---|
| `agentId` | string | Must match server's `AGENT_ID` |
| `command` | string | The instruction text for the agent |
| `scope` | string | Must be in `ALLOWED_SCOPES` |
| `nonce` | string/number | Unique per owner, cannot be reused |
| `deadline` | string/number | Unix timestamp, must be in the future |
| `signature` | string | EIP-712 signature from an owner wallet (`0x`-prefixed hex) |

**Validation order:**

1. Body schema validation
2. `agentId` matches server config
3. `scope` is in allowed list
4. `command` size is under `MAX_COMMAND_BYTES`
5. `deadline` has not passed
6. `signature` recovers a configured owner address
7. `nonce` has not been used by this owner

**Success response `200`:**

```json
{
  "accepted": true,
  "record": {
    "id": "1718700000265-1718700000000",
    "createdAt": "2026-06-18T12:00:00.265Z",
    "owner": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "agentId": "hermes-eigen-dev",
    "scope": "chat",
    "nonce": "1718700000000",
    "deadline": "1718700300",
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

### Error Responses

All errors return a JSON body with an `error` field.

---

#### `400` — Invalid Body

The request body failed schema validation.

```json
{
  "error": "invalid_body",
  "details": {
    "fieldErrors": {
      "signature": ["Invalid"]
    },
    "formErrors": []
  }
}
```

**Fix:** Ensure all required fields are present and correctly typed. `signature` must be `0x`-prefixed hex. `nonce` and `deadline` can be strings or numbers.

---

#### `400` — Wrong Agent

The `agentId` in the signed command doesn't match this server.

```json
{
  "error": "wrong_agent",
  "expected": "hermes-eigen-dev"
}
```

**Fix:** Set `agentId` to the value shown in `expected`, or check that you're submitting to the correct server. Use `GET /status` to verify.

---

#### `400` — Expired Deadline

The `deadline` timestamp has already passed.

```json
{
  "error": "expired_deadline"
}
```

**Fix:** Sign a new command with a future deadline. Use `GET /challenge` to get a fresh deadline (5 minutes from now).

---

#### `401` — Invalid Signature

The signature did not recover any configured owner address.

```json
{
  "error": "invalid_signature"
}
```

**Fix:** Verify that:
- You're signing with a key whose address is in `OWNER_ADDRESSES`
- The EIP-712 domain (chain ID, verifying contract) matches the server's config
- All message fields match exactly what was signed

Use `GET /status` to check the server's EIP-712 domain and owner list.

---

#### `403` — Scope Not Allowed

The requested scope is not enabled on this server.

```json
{
  "error": "scope_not_allowed",
  "allowedScopes": ["chat", "research", "code", "wallet-read"]
}
```

**Fix:** Use one of the scopes listed in `allowedScopes`. To enable additional scopes, update `ALLOWED_SCOPES` in the server configuration.

---

#### `409` — Nonce Replay

This owner has already used this nonce.

```json
{
  "error": "nonce_replay"
}
```

**Fix:** Use a new nonce. Each nonce can only be used once per owner. Use `GET /challenge` to get a fresh nonce, or use `Date.now()` to generate one.

---

#### `413` — Command Too Large

The command text exceeds the configured byte limit.

```json
{
  "error": "command_too_large",
  "maxCommandBytes": 4096
}
```

**Fix:** Shorten the command text to fit within `maxCommandBytes` (default: 4096 bytes).

---

#### `503` — No Owners Configured

The server has no owner addresses configured.

```json
{
  "error": "OWNER_ADDRESSES is empty"
}
```

**Fix:** Set `OWNER_ADDRESSES` in the server's `.env` file to at least one valid EVM address, then restart.

---

## `GET /attestation`

Placeholder for EigenCompute TEE attestation metadata. Returns static data in the current prototype.

**Request:**

```bash
curl http://localhost:3000/attestation | jq
```

**Response `200`:**

```json
{
  "status": "placeholder",
  "note": "On EigenCompute, link this endpoint to ecloud verification data and TEE quote retrieval.",
  "expectedPersistentDataPath": "/mnt/disks/userdata",
  "agentId": "hermes-eigen-dev"
}
```

**Production version** should return:

- Eigen verification dashboard URL
- Application ID
- Docker image digest
- Release ID
- App wallet address
- TEE quote or quote retrieval status
