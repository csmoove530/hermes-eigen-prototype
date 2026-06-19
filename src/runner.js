import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

function hashCommand(command) {
  return crypto.createHash('sha256').update(command).digest('hex');
}

export async function runAgentCommand({ config, message, owner }) {
  if (config.runnerMode === 'mock') {
    return {
      mode: 'mock',
      status: 'completed',
      output: `Accepted ${message.scope} command for ${config.agentId}: ${message.command}`,
      commandHash: hashCommand(message.command)
    };
  }

  if (config.runnerMode !== 'hermes') {
    throw new Error(`Unsupported RUNNER_MODE: ${config.runnerMode}`);
  }

  return runHermesCli({ config, message, owner });
}

function runHermesCli({ config, message, owner }) {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-lc', config.hermesCommand], {
      env: {
        ...process.env,
        HERMES_AGENT_ID: config.agentId,
        HERMES_COMMAND_OWNER: owner,
        HERMES_COMMAND_SCOPE: message.scope
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Hermes command timed out after ${config.hermesTimeoutMs}ms`));
    }, config.hermesTimeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        mode: 'hermes',
        status: code === 0 ? 'completed' : 'failed',
        exitCode: code,
        output: stdout.trim(),
        error: stderr.trim(),
        commandHash: hashCommand(message.command)
      });
    });

    child.stdin.end(`${message.command}\n`);
  });
}
