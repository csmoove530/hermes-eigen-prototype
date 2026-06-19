import { privateKeyToAccount } from 'viem/accounts';
import { buildDomain, commandTypes } from '../src/eip712.js';
import { loadConfig } from '../src/config.js';

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error('Set PRIVATE_KEY=0x... to sign a command.');
  process.exit(1);
}

const config = loadConfig();
const account = privateKeyToAccount(privateKey);
const message = {
  agentId: process.env.AGENT_ID || config.agentId,
  command: process.argv.slice(2).join(' ') || 'Say hello from Hermes Eigen prototype.',
  scope: process.env.SCOPE || 'chat',
  nonce: BigInt(process.env.NONCE || Date.now()),
  deadline: BigInt(process.env.DEADLINE || Math.floor(Date.now() / 1000 + 300))
};

const signature = await account.signTypedData({
  domain: buildDomain(config),
  types: commandTypes,
  primaryType: 'AgentCommand',
  message
});

console.log(JSON.stringify({
  owner: account.address,
  ...message,
  nonce: message.nonce.toString(),
  deadline: message.deadline.toString(),
  signature
}, null, 2));
