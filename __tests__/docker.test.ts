import { beforeEach, describe, expect, jest, test } from '@jest/globals';  
import * as core from '@actions/core';  
import { Docker } from '@docker/actions-toolkit/lib/docker/docker';  
import * as aws from '../src/aws';  
import { login, loginStandard, loginECR, logout } from '../src/docker';  

// Mocks  
jest.mock('@actions/core');  
jest.mock('@docker/actions-toolkit/lib/docker/docker');  
jest.mock('../src/aws');  

const mockGetRegistriesData = aws.getRegistriesData as jest.MockedFunction<typeof aws.getRegistriesData>;  
const mockIsECR = aws.isECR as jest.MockedFunction<typeof aws.isECR>;  

describe('Docker Commands', () => {  
  beforeEach(() => {  
    jest.clearAllMocks();  
  });  

  test('login handles standard registry', async () => {  
    jest.spyOn(Docker, 'getExecOutput').mockResolvedValue({  
      exitCode: 0,  
      stdout: '',  
      stderr: ''  
    } as any);  

    await login('registry.example.com', 'username', 'password', 'false');  

    expect(Docker.getExecOutput).toHaveBeenCalledWith(  
      ['login', '--password-stdin', '--username', 'username', 'registry.example.com'],  
      expect.objectContaining({  
        ignoreReturnCode: true,  
        silent: true,  
        input: Buffer.from('password')  
      })  
    );  
  });  

  test('login handles ECR registry', async () => {  
    mockIsECR.mockReturnValue(true);  
    jest.spyOn(Docker, 'getExecOutput').mockResolvedValue({  
      exitCode: 0,  
      stdout: '',  
      stderr: ''  
    } as any);  
    
    mockGetRegistriesData.mockResolvedValue([  
      {  
        registry: 'registry.example.com',  
        username: 'AWS',  
        password: 'token'  
      }  
    ]);  

    await login('registry.example.com', 'username', 'password', 'auto');  

    expect(mockIsECR).toHaveBeenCalledWith('registry.example.com');  
    expect(mockGetRegistriesData).toHaveBeenCalled();  
  });  

  test('loginStandard validates credentials', async () => {  
    await expect(loginStandard('registry.example.com', '', '')).rejects.toThrow('Username and password required');  
    await expect(loginStandard('registry.example.com', 'user', '')).rejects.toThrow('Password required');  
    await expect(loginStandard('registry.example.com', '', 'pass')).rejects.toThrow('Username required');  
  });  

  test('loginECR handles multiple registries', async () => {  
    jest.spyOn(Docker, 'getExecOutput').mockResolvedValue({  
      exitCode: 0,  
      stdout: '',  
      stderr: ''  
    } as any);  
    
    mockGetRegistriesData.mockResolvedValue([  
      {  
        registry: 'registry1.example.com',  
        username: 'AWS',  
        password: 'token1'  
      },  
      {  
        registry: 'registry2.example.com',  
        username: 'AWS',  
        password: 'token2'  
      }  
    ]);  

    await loginECR('012345678901.dkr.ecr.region-1.amazonaws.com', 'AWS', 'dummy-password');  

    expect(mockGetRegistriesData).toHaveBeenCalledWith('012345678901.dkr.ecr.region-1.amazonaws.com');  
    expect(Docker.getExecOutput).toHaveBeenCalledTimes(2);  
    expect(Docker.getExecOutput).toHaveBeenNthCalledWith(  
      1,  
      ['login', '--password-stdin', '--username', 'AWS', 'registry1.example.com'],  
      expect.objectContaining({  
        ignoreReturnCode: true,  
        silent: true,  
        input: Buffer.from('token1')  
      })  
    );  
    expect(Docker.getExecOutput).toHaveBeenNthCalledWith(  
      2,  
      ['login', '--password-stdin', '--username', 'AWS', 'registry2.example.com'],  
      expect.objectContaining({  
        ignoreReturnCode: true,  
        silent: true,  
        input: Buffer.from('token2')  
      })  
    );  
  });  

  test('handles Docker not available', async () => {  
    jest.spyOn(Docker, 'getExecOutput').mockRejectedValue(  
      new Error('Unable to locate executable file: docker')  
    );  
    
    await loginStandard('registry.example.com', 'user', 'pass');  
    expect(core.warning).toHaveBeenCalledWith('Docker not available - skipping login');  
  });  

  test('logout handles successful logout', async () => {  
    jest.spyOn(Docker, 'getExecOutput').mockResolvedValue({  
      exitCode: 0,  
      stdout: '',  
      stderr: ''  
    } as any);  

    await logout('registry.example.com');  

    expect(Docker.getExecOutput).toHaveBeenCalledWith(  
      ['logout', 'registry.example.com'],  
      expect.objectContaining({  
        ignoreReturnCode: true  
      })  
    );  
    expect(core.info).toHaveBeenCalledWith('Successfully logged out');  
  });  

  test('logout handles Docker not available', async () => {  
    jest.spyOn(Docker, 'getExecOutput').mockRejectedValue(  
      new Error('Unable to locate executable file: docker')  
    );  

    await logout('registry.example.com');  
    expect(core.warning).toHaveBeenCalledWith('Docker not available - skipping logout');  
  });  

  test('logout handles error with warning', async () => {  
    jest.spyOn(Docker, 'getExecOutput').mockResolvedValue({  
      exitCode: 1,  
      stdout: '',  
      stderr: 'Error message'  
    } as any);  

    await logout('registry.example.com');  
    expect(core.warning).toHaveBeenCalledWith('Error message');  
  });  
});