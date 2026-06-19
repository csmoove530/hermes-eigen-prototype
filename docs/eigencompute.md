# EigenCompute Deployment

This project is structured for EigenCompute but runs anywhere Docker runs.

## Prerequisites

- Docker with `buildx` support
- [Eigen CLI](https://docs.eigencompute.com/) (`@layr-labs/ecloud-cli`)
- A Docker Hub (or compatible registry) account
- An EVM wallet address to use as the command owner

## EigenCompute Requirements

| Requirement | Value |
|---|---|
| Image architecture | `linux/amd64` |
| Bind address | `0.0.0.0` |
| Persistent storage | `/mnt/disks/userdata` |
| Secrets delivery | Encrypted env file (not image `ENV`) |
| Verification | Image digest checked post-deploy |

## Step 1: Configure Environment

```bash
cp .env.example .env
```

Set at minimum:

```bash
OWNER_ADDRESSES=0xYourOwnerAddress
AGENT_ID=hermes-eigen-main
RUNNER_MODE=mock
DATA_DIR=/mnt/disks/userdata
```

Keep `RUNNER_MODE=mock` until the API, verification dashboard, and command signing flow are tested end-to-end.

Do not commit `.env`.

## Step 2: Install Eigen CLI

```bash
npm install -g @layr-labs/ecloud-cli
ecloud auth login
ecloud billing subscribe
```

Start with Sepolia:

```bash
ecloud compute env set sepolia
ecloud auth whoami
```

## Step 3: Build the Image

```bash
docker buildx build --platform linux/amd64 \
  -t yourdockerhub/hermes-eigen-prototype:latest \
  --push .
```

The included Dockerfile:

- Uses Node 22 slim
- Runs as root (EigenCompute TEE templates commonly require root)
- Exposes port 3000
- Sets `DATA_DIR=/mnt/disks/userdata`

## Step 4: Deploy

```bash
ecloud compute app deploy \
  --image-ref yourdockerhub/hermes-eigen-prototype:latest \
  --name hermes-eigen-prototype \
  --env-file .env \
  --instance-type g1-standard-4t \
  --log-visibility private
```

Keep logs private. Commands can contain sensitive user intent.

## Step 5: Verify Deployment

```bash
ecloud compute app info
ecloud compute app logs
```

Then check the Eigen verification dashboard for:

- Application ID
- Creator address
- Docker image digest
- Release history
- TEE attestation
- App wallet addresses

## Step 6: Verifiable Source Build (Optional)

For public, auditable deployments:

```bash
ecloud compute app deploy \
  --verifiable \
  --repo https://github.com/csmoove530/hermes-eigen-prototype \
  --commit $(git rev-parse HEAD) \
  --env-file .env \
  --instance-type g1-standard-4t \
  --log-visibility private
```

Use pinned commits. Do not deploy from a moving branch for verifiability-sensitive agents.

## Production Checklist

Before enabling wallet writes or real funds:

- [ ] Use a dedicated owner wallet, not your primary wallet
- [ ] Set `EIP712_VERIFYING_CONTRACT` to a stable controller/registry address
- [ ] Add spending limits (onchain or file-backed policy definitions)
- [ ] Add chain and protocol allowlists
- [ ] Run Hermes with a restricted tool profile
- [ ] Persist Hermes state under `/mnt/disks/userdata`
- [ ] Verify upgrades before allowing access to funds
- [ ] Keep logs private
- [ ] Test these failure cases:
  - Nonce replay
  - Expired command
  - Wrong owner address
  - Wrong agent ID
  - Disabled scope
