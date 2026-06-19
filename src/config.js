import { getAddress, isAddress } from 'viem';

const DEFAULT_VERIFYING_CONTRACT = '0x0000000000000000000000000000000000000001';

function readInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer`);
  }
  return parsed;
}

function readAddressList(name) {
  const raw = process.env[name] ?? '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      if (!isAddress(value)) {
        throw new Error(`${name} contains invalid address: ${value}`);
      }
      return getAddress(value);
    });
}

function readAddress(name, fallback) {
  const value = process.env[name] || fallback;
  if (!isAddress(value)) {
    throw new Error(`${name} must be an EVM address`);
  }
  return getAddress(value);
}

export function loadConfig() {
  const ownerAddresses = readAddressList('OWNER_ADDRESSES');
  const allowedScopes = (process.env.ALLOWED_SCOPES ?? 'chat,research,code,wallet-read')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

  return {
    host: process.env.HOST || '0.0.0.0',
    port: readInt('PORT', 3000),
    agentId: process.env.AGENT_ID || 'hermes-eigen-dev',
    ownerAddresses,
    dataDir: process.env.DATA_DIR || process.env.USER_PERSISTENT_DATA_PATH || '.data',
    runnerMode: process.env.RUNNER_MODE || 'mock',
    hermesCommand: process.env.HERMES_COMMAND || 'hermes',
    hermesTimeoutMs: readInt('HERMES_TIMEOUT_MS', 120000),
    maxCommandBytes: readInt('MAX_COMMAND_BYTES', 4096),
    allowedScopes,
    eip712: {
      chainId: readInt('EIP712_CHAIN_ID', 11155111),
      verifyingContract: readAddress('EIP712_VERIFYING_CONTRACT', DEFAULT_VERIFYING_CONTRACT)
    }
  };
}
