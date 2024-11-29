import * as aws from './aws';
import * as core from '@actions/core';
import { Docker } from '@docker/actions-toolkit/lib/docker/docker';

export async function login(
  registry: string,
  username: string,
  password: string,
  ecr: string
): Promise<void> {
  if (/true/i.test(ecr) || (ecr == 'auto' && aws.isECR(registry))) {
    await loginECR(registry, username, password);
  } else {
    await loginStandard(registry, username, password);
  }
}

export async function logout(registry: string): Promise<void> {
  try {
    const res = await Docker.getExecOutput(['logout', registry], {
      ignoreReturnCode: true
    });

    if (res.stderr.length > 0 && res.exitCode != 0) {
      core.warning(res.stderr.trim());
    } else {
      core.info('Successfully logged out');
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Unable to locate executable file: docker')
    ) {
      core.warning('Docker not available - skipping logout');
      return;
    }
    throw error;
  }
}

export async function loginStandard(
  registry: string,
  username: string,
  password: string
): Promise<void> {
  if (!username && !password) {
    throw new Error('Username and password required');
  }
  if (!username) {
    throw new Error('Username required');
  }
  if (!password) {
    throw new Error('Password required');
  }

  const loginArgs: Array<string> = ['login', '--password-stdin'];
  loginArgs.push('--username', username);
  loginArgs.push(registry);

  if (registry) {
    core.info(`Logging into ${registry}...`);
  } else {
    core.info('Logging into Docker Hub...');
  }

  try {
    const res = await Docker.getExecOutput(loginArgs, {
      ignoreReturnCode: true,
      silent: true,
      input: Buffer.from(password)
    });

    if (res.stderr.length > 0 && res.exitCode != 0) {
      throw new Error(res.stderr.trim());
    }
    core.info('Login Succeeded!');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Unable to locate executable file: docker')
    ) {
      core.warning('Docker not available - skipping login');
      return;
    }
    throw error;
  }
}

export async function loginECR(
  registry: string,
  _username: string,
  _password: string
): Promise<void> {
  try {
    core.info('Retrieving registries data through AWS SDK...');
    const regDatas = await aws.getRegistriesData(registry);

    for (const regData of regDatas) {
      core.info(`Logging into ${regData.registry}...`);

      const res = await Docker.getExecOutput(
        [
          'login',
          '--password-stdin',
          '--username',
          regData.username,
          regData.registry
        ],
        {
          ignoreReturnCode: true,
          silent: true,
          input: Buffer.from(regData.password)
        }
      );

      if (res.stderr.length > 0 && res.exitCode != 0) {
        throw new Error(res.stderr.trim());
      }
      core.info('Login Succeeded!');
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Unable to locate executable file: docker')
    ) {
      core.warning('Docker not available - skipping ECR login');
      return;
    }
    throw error;
  }
}
