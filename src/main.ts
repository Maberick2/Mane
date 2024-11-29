import * as core from '@actions/core';
import * as exec from '@actions/exec';

async function dockerLogin(
  username: string,
  password: string,
  registry?: string
): Promise<void> {
  const args = ['login'];
  if (username) args.push('--username', username);
  args.push('--password-stdin');
  if (registry) args.push(registry);

  const options: exec.ExecOptions = {
    input: Buffer.from(password || ''),
    silent: true
  };

  try {
    await exec.getExecOutput('docker', args, options);
  } catch (error) {
    throw new Error(
      `Failed to login to Docker registry: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function dockerLogout(registry: string): Promise<void> {
  try {
    await exec.getExecOutput('docker', ['logout', registry]);
  } catch (error) {
    core.warning(
      `Failed to logout from Docker registry: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Exportar run para testing
export async function run(): Promise<void> {
  try {
    core.saveState('isPost', 'true');

    const username = core.getInput('username');
    const password = core.getInput('password');
    const registry = core.getInput('registry');
    const ecr = core.getInput('ecr') === 'true';
    const logout = core.getInput('logout');

    await dockerLogin(username, password, registry);

    core.saveState('registry', registry || '');
    core.saveState('logout', logout);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

// Exportar cleanup para testing
export async function cleanup(): Promise<void> {
  try {
    const registry = core.getState('registry');
    const shouldLogout = core.getState('logout') === 'true';

    if (shouldLogout && registry) {
      await dockerLogout(registry);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.warning(`Logout failed: ${error.message}`);
    } else {
      core.warning('Logout failed with an unexpected error');
    }
  }
}

// Función principal
export async function main(): Promise<void> {
  const isPost = core.getState('isPost') === 'true';

  if (isPost) {
    await cleanup();
  } else {
    await run();
  }
}

// Ejecutar solo si no estamos en modo test
if (!process.env.JEST_WORKER_ID) {
  main();
}
