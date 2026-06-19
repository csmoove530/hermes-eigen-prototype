# EigenCompute Deployment

This project is structured for EigenCompute, but it can run anywhere Docker runs.

EigenCompute-specific assumptions:

- container image must target `linux/amd64`
- app should bind to `0.0.0.0`
- runtime state should be stored under `/mnt/disks/userdata`
- secrets should be supplied through encrypted environment handling, not image `ENV`
- app release and Docker digest should be verified after deployment

## 1. Configure Environment

Copy the template:

```bash
cp .env.example .env
```

Set at least:

```bash
OWNER_ADDRESSES=0xYourOwnerAddress
AGENT_ID=hermes-eigen-main
RUNNER_MODE=mock
DATA_DIR=/mnt/disks/userdata
```

For production, keep `RUNNER_MODE=mock` until the API, verification dashboard, and command signing flow are tested.

Do not commit `.env`.

## 2. Install Eigen CLI

```bash
npm install -g @layr-labs/ecloud-cli
ecloud auth login
ecloud billing subscribe
```

Use Sepolia first.

```bash
ecloud compute env set sepolia
ecloud auth whoami
```

## 3. Build An Image

Docker must be running.

```bash
docker buildx build --platform linux/amd64 \
  -t yourdockerhub/hermes-eigen-prototype:latest \
  --push .
```

The included Dockerfile:

- uses Node 22 slim
- runs as root because EigenCompute TEE templates commonly require root
- exposes port 3000
- sets `DATA_DIR=/mnt/disks/userdata`

## 4. Deploy

```bash
ecloud compute app deploy \
  --image-ref yourdockerhub/hermes-eigen-prototype:latest \
  --name hermes-eigen-prototype \
  --env-file .env \
  --instance-type g1-standard-4t \
  --log-visibility private
```

Keep logs private unless you have reviewed every log path. Commands can contain sensitive user intent.

## 5. Verifiable Source Build

Once the repository is public and stable:

```bash
ecloud compute app deploy \
  --verifiable \
  --repo https://github.com/<owner>/hermes-eigen-prototype \
  --commit $(git rev-parse HEAD) \
  --env-file .env \
  --instance-type g1-standard-4t \
  --log-visibility private
```

Use pinned commits. Do not deploy from a moving branch for verifiability-sensitive agents.

## 6. Verify Deployment

After deployment:

```bash
ecloud compute app info
ecloud compute app logs
```

Then check the Eigen verification dashboard for:

- application ID
- creator address
- Docker image digest
- release history
- TEE attestation
- app wallet addresses

The current `/attestation` endpoint is a placeholder. A production integration should expose a stable app verification URL and release metadata.

## 7. Production Checklist

Before enabling wallet writes or real funds:

- Use a dedicated owner wallet, not your primary wallet.
- Set `EIP712_VERIFYING_CONTRACT` to a stable controller/registry address.
- Add onchain or file-backed policy definitions for spending limits.
- Add chain and protocol allowlists.
- Run Hermes with a restricted tool profile.
- Persist Hermes state under `/mnt/disks/userdata`.
- Verify upgrades before allowing the new release to access funds.
- Keep logs private.
- Test nonce replay, expired command, wrong owner, wrong agent ID, and disabled scope failures.
