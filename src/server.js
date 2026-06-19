import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { buildDomain, commandTypes, normalizeCommandMessage, verifyCommandSignature } from './eip712.js';
import { runAgentCommand } from './runner.js';
import { JsonStore } from './store.js';

const commandBodySchema = z.object({
  agentId: z.string().min(1),
  command: z.string().min(1),
  scope: z.string().min(1),
  nonce: z.union([z.string(), z.number(), z.bigint()]).transform((value) => value.toString()),
  deadline: z.union([z.string(), z.number(), z.bigint()]).transform((value) => value.toString()),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/)
});

export async function buildServer(config = loadConfig()) {
  const app = Fastify({ logger: true });
  const store = new JsonStore(config.dataDir);
  await store.init();
  await app.register(cors, { origin: true });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'hermes-eigen-controller',
    runnerMode: config.runnerMode
  }));

  app.get('/status', async () => ({
    agentId: config.agentId,
    owners: config.ownerAddresses,
    allowedScopes: config.allowedScopes,
    eip712: {
      domain: buildDomain(config),
      primaryType: 'AgentCommand',
      types: commandTypes
    },
    recentCommands: store.listCommands(10)
  }));

  app.get('/challenge', async (request) => {
    const scope = String(request.query.scope || 'chat');
    return {
      agentId: config.agentId,
      scope,
      nonce: Date.now().toString(),
      deadline: Math.floor(Date.now() / 1000 + 300).toString(),
      domain: buildDomain(config),
      primaryType: 'AgentCommand',
      types: commandTypes
    };
  });

  app.get('/attestation', async () => ({
    status: 'placeholder',
    note: 'On EigenCompute, link this endpoint to ecloud verification data and TEE quote retrieval.',
    expectedPersistentDataPath: config.dataDir,
    agentId: config.agentId
  }));

  app.post('/command', async (request, reply) => {
    if (config.ownerAddresses.length === 0) {
      return reply.code(503).send({ error: 'OWNER_ADDRESSES is empty' });
    }

    const parsed = commandBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
    }

    const body = parsed.data;
    if (body.agentId !== config.agentId) {
      return reply.code(400).send({ error: 'wrong_agent', expected: config.agentId });
    }

    if (!config.allowedScopes.includes(body.scope)) {
      return reply.code(403).send({ error: 'scope_not_allowed', allowedScopes: config.allowedScopes });
    }

    if (Buffer.byteLength(body.command, 'utf8') > config.maxCommandBytes) {
      return reply.code(413).send({ error: 'command_too_large', maxCommandBytes: config.maxCommandBytes });
    }

    const message = normalizeCommandMessage(body);
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (message.deadline < now) {
      return reply.code(400).send({ error: 'expired_deadline' });
    }

    const owner = await verifyCommandSignature({
      config,
      message,
      signature: body.signature,
      ownerAddresses: config.ownerAddresses
    });

    if (!owner) {
      return reply.code(401).send({ error: 'invalid_signature' });
    }

    if (store.hasNonce(owner, message.nonce)) {
      return reply.code(409).send({ error: 'nonce_replay' });
    }

    await store.markNonce(owner, message.nonce);
    const result = await runAgentCommand({ config, message, owner });
    const record = {
      id: `${Date.now()}-${message.nonce.toString()}`,
      createdAt: new Date().toISOString(),
      owner,
      agentId: message.agentId,
      scope: message.scope,
      nonce: message.nonce.toString(),
      deadline: message.deadline.toString(),
      commandHash: result.commandHash,
      status: result.status,
      runnerMode: result.mode
    };
    await store.addCommand(record);

    return {
      accepted: true,
      record,
      result
    };
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const app = await buildServer(config);
  await app.listen({ host: config.host, port: config.port });
}
