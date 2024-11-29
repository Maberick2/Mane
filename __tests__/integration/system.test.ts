import { GenericContainer, StartedTestContainer } from 'testcontainers';  
import { expect, describe, beforeAll, afterAll, test, beforeEach } from '@jest/globals';  
import * as exec from '@actions/exec';  
import * as core from '@actions/core';  
import { run, cleanup } from '../../src/main';  

jest.mock('@actions/core');  
jest.mock('@actions/exec');  

describe('Docker Login System Tests', () => {  
  let container: StartedTestContainer;  
  let registryUrl: string;  

  beforeAll(async () => {  
    container = await new GenericContainer('registry:2')  
      .withExposedPorts(5000)  
      .start();  

    registryUrl = `localhost:${container.getMappedPort(5000)}`;  
  });  

  afterAll(async () => {  
    if (container) {  
      await container.stop();  
    }  
  });  

  beforeEach(() => {  
    jest.clearAllMocks();  
    // Limpiar el estado  
    delete process.env.STATE_isPost;  
    delete process.env.STATE_registry;  
    delete process.env.STATE_logout;  

    // Mock de core.getInput  
    (core.getInput as jest.Mock).mockImplementation((name: string) => {  
      switch (name) {  
        case 'username':  
          return process.env.INPUT_USERNAME || '';  
        case 'password':  
          return process.env.INPUT_PASSWORD || '';  
        case 'registry':  
          return process.env.INPUT_REGISTRY || '';  
        case 'ecr':  
          return process.env.INPUT_ECR || 'false';  
        case 'logout':  
          return process.env.INPUT_LOGOUT || '';  
        default:  
          return '';  
      }  
    });  

    // Mock de core.getState  
    (core.getState as jest.Mock).mockImplementation((name: string) => {  
      return process.env[`STATE_${name}`] || '';  
    });  

    // Mock de exec.getExecOutput  
    (exec.getExecOutput as jest.Mock).mockResolvedValue({  
      exitCode: 0,  
      stdout: '',  
      stderr: ''  
    });  
  });  

  test('should handle login workflow', async () => {  
    process.env.INPUT_USERNAME = 'test-user';  
    process.env.INPUT_PASSWORD = 'test-password';  
    process.env.INPUT_REGISTRY = registryUrl;  
    process.env.INPUT_ECR = 'false';  
    process.env.INPUT_LOGOUT = 'true';  

    await run();  

    // Verificar saveState  
    expect(core.saveState).toHaveBeenCalledWith('isPost', 'true');  
    expect(core.saveState).toHaveBeenCalledWith('registry', registryUrl);  
    expect(core.saveState).toHaveBeenCalledWith('logout', 'true');  

    // Verificar docker login  
    expect(exec.getExecOutput).toHaveBeenCalledWith(  
      'docker',  
      expect.arrayContaining([  
        'login',  
        '--username',  
        'test-user',  
        '--password-stdin',  
        registryUrl  
      ]),  
      expect.objectContaining({  
        input: expect.any(Buffer),  
        silent: true  
      })  
    );  
  });  

  test('should handle Docker Hub login', async () => {  
    process.env.INPUT_USERNAME = 'test-user';  
    process.env.INPUT_PASSWORD = 'test-password';  
    process.env.INPUT_ECR = 'false';  
    process.env.INPUT_LOGOUT = 'true';  

    await run();  

    // Verificar docker login  
    expect(exec.getExecOutput).toHaveBeenCalledWith(  
      'docker',  
      expect.arrayContaining([  
        'login',  
        '--username',  
        'test-user',  
        '--password-stdin'  
      ]),  
      expect.objectContaining({  
        input: expect.any(Buffer),  
        silent: true  
      })  
    );  
  });  

  test('should handle login failure', async () => {  
    process.env.INPUT_USERNAME = 'invalid-user';  
    process.env.INPUT_PASSWORD = 'invalid-password';  
    process.env.INPUT_REGISTRY = registryUrl;  

    // Simular error  
    (exec.getExecOutput as jest.Mock).mockRejectedValue(  
      new Error('Login failed')  
    );  

    await run();  

    expect(core.setFailed).toHaveBeenCalledWith(  
      expect.stringContaining('Failed to login to Docker registry')  
    );  
  });  

  test('should handle logout phase', async () => {  
    process.env.STATE_registry = registryUrl;  
    process.env.STATE_logout = 'true';  

    await cleanup();  

    // Verificar que la función fue llamada  
    expect(exec.getExecOutput).toHaveBeenCalled();  
    
    // Obtener los argumentos de la llamada  
    const [command, args] = (exec.getExecOutput as jest.Mock).mock.calls[0];  
    
    // Verificar cada parte individualmente  
    expect(command).toBe('docker');  
    expect(args).toEqual(['logout', registryUrl]);  
  });  
});