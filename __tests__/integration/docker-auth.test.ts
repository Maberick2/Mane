import {describe, expect, test, beforeEach, afterEach} from '@jest/globals';
import * as docker from '../../src/docker';
import * as core from '@actions/core';
import {Docker} from '@docker/actions-toolkit/lib/docker/docker';

// Mock de @actions/core
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}));

describe('Docker Authentication Integration', () => {
  const registry = 'https://index.docker.io/v1/';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should authenticate with Docker Hub', async () => {
    const username = process.env.DOCKER_USERNAME;
    const password = process.env.DOCKER_PASSWORD;

    if (!username || !password) {
      console.warn('Skipping test: credentials not available');
      return;
    }

    await expect(docker.login(registry, username, password, 'false')).resolves.not.toThrow();
  });

  test('should fail with invalid credentials', async () => {
    await expect(docker.login(registry, 'invalid_user', 'invalid_pass', 'false')).rejects.toBeDefined();
  });

  test('should successfully logout', async () => {
    // Mock de Docker.getExecOutput para simular un logout exitoso
    const mockExecOutput = jest.spyOn(Docker, 'getExecOutput').mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: ''
    });

    await docker.logout(registry);

    // Verificamos que se llamó con los argumentos correctos
    expect(mockExecOutput).toHaveBeenCalledWith(
      ['logout', registry],
      expect.objectContaining({
        ignoreReturnCode: true
      })
    );

    // Verificamos que se registró el éxito
    expect(core.info).toHaveBeenCalledWith('Successfully logged out');
  });

  test('should handle Docker not available during logout', async () => {
    // Mock para simular que Docker no está disponible
    jest.spyOn(Docker, 'getExecOutput').mockRejectedValueOnce(new Error('Unable to locate executable file: docker'));

    await docker.logout(registry);

    // Verificamos que se manejó correctamente
    expect(core.warning).toHaveBeenCalledWith('Docker not available - skipping logout');
  });

  test('should validate required credentials', async () => {
    await expect(docker.loginStandard(registry, '', '')).rejects.toThrow('Username and password required');

    await expect(docker.loginStandard(registry, 'user', '')).rejects.toThrow('Password required');

    await expect(docker.loginStandard(registry, '', 'pass')).rejects.toThrow('Username required');
  });
});
