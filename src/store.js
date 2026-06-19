import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EMPTY_STATE = {
  usedNonces: {},
  commands: []
};

export class JsonStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'state.json');
    this.state = structuredClone(EMPTY_STATE);
  }

  async init() {
    await mkdir(this.dataDir, { recursive: true });
    try {
      const raw = await readFile(this.filePath, 'utf8');
      this.state = JSON.parse(raw);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.flush();
    }
  }

  hasNonce(owner, nonce) {
    const ownerKey = owner.toLowerCase();
    return Boolean(this.state.usedNonces[ownerKey]?.[String(nonce)]);
  }

  async markNonce(owner, nonce) {
    const ownerKey = owner.toLowerCase();
    this.state.usedNonces[ownerKey] ??= {};
    this.state.usedNonces[ownerKey][String(nonce)] = new Date().toISOString();
    await this.flush();
  }

  async addCommand(record) {
    this.state.commands.unshift(record);
    this.state.commands = this.state.commands.slice(0, 100);
    await this.flush();
  }

  listCommands(limit = 20) {
    return this.state.commands.slice(0, limit);
  }

  async flush() {
    await writeFile(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`);
  }
}
