import test from 'node:test';
import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import { buildDomain, commandTypes, verifyCommandSignature } from '../src/eip712.js';

const privateKey = '0x59c6995e998f97a5a0044966f0945386129d174e7d3bd65fc2fbe59a8c835f50';
const account = privateKeyToAccount(privateKey);

const config = {
  eip712: {
    chainId: 11155111,
    verifyingContract: '0x0000000000000000000000000000000000000001'
  }
};

test('verifies an owner-signed EIP-712 command', async () => {
  const message = {
    agentId: 'hermes-eigen-dev',
    command: 'Run a status check',
    scope: 'chat',
    nonce: 1n,
    deadline: 9999999999n
  };
  const signature = await account.signTypedData({
    domain: buildDomain(config),
    types: commandTypes,
    primaryType: 'AgentCommand',
    message
  });

  const owner = await verifyCommandSignature({
    config,
    message,
    signature,
    ownerAddresses: [account.address]
  });

  assert.equal(owner, account.address);
});

test('rejects signatures from non-owners', async () => {
  const message = {
    agentId: 'hermes-eigen-dev',
    command: 'Run a status check',
    scope: 'chat',
    nonce: 1n,
    deadline: 9999999999n
  };
  const signature = await account.signTypedData({
    domain: buildDomain(config),
    types: commandTypes,
    primaryType: 'AgentCommand',
    message
  });

  const owner = await verifyCommandSignature({
    config,
    message,
    signature,
    ownerAddresses: ['0x000000000000000000000000000000000000dEaD']
  });

  assert.equal(owner, null);
});
