import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';  
import * as docker from '../../src/docker';  
import * as core from '@actions/core';  
import { Docker } from '@docker/actions-toolkit/lib/docker/docker';  

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

    const execSpy = jest.spyOn(Docker, 'getExecOutput').mockResolvedValueOnce({  
      exitCode: 0,  
      stdout: '',  
      stderr: ''  
    });  

    await docker.login(registry, username, password, 'false');  
    expect(execSpy).toHaveBeenCalled();  
  });  

  test('should validate required credentials', async () => {  
    await expect(docker.loginStandard(registry, '', '')).rejects.toThrow(  
      'Username and password required'  
    );  
  });  

  test('should handle Docker not available during login', async () => {  
    jest.spyOn(Docker, 'getExecOutput').mockRejectedValueOnce(  
      new Error('Unable to locate executable file: docker')  
    );  

    await docker.loginStandard(registry, 'user', 'pass');  
    expect(core.warning).toHaveBeenCalledWith('Docker not available - skipping login');  
  });  
});