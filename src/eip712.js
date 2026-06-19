import { getAddress, verifyTypedData } from 'viem';

export const domainName = 'HermesEigenController';
export const domainVersion = '1';

export const commandTypes = {
  AgentCommand: [
    { name: 'agentId', type: 'string' },
    { name: 'command', type: 'string' },
    { name: 'scope', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

export function buildDomain(config) {
  return {
    name: domainName,
    version: domainVersion,
    chainId: config.eip712.chainId,
    verifyingContract: config.eip712.verifyingContract
  };
}

export function normalizeCommandMessage(body) {
  return {
    agentId: body.agentId,
    command: body.command,
    scope: body.scope,
    nonce: BigInt(body.nonce),
    deadline: BigInt(body.deadline)
  };
}

export async function verifyCommandSignature({ config, message, signature, ownerAddresses }) {
  for (const owner of ownerAddresses) {
    const ok = await verifyTypedData({
      address: owner,
      domain: buildDomain(config),
      types: commandTypes,
      primaryType: 'AgentCommand',
      message,
      signature
    });

    if (ok) {
      return getAddress(owner);
    }
  }

  return null;
}
