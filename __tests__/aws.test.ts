import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AuthorizationData } from '@aws-sdk/client-ecr';
import * as aws from '../src/aws';

describe('isECR', () => {
  test.each([
    ['registry.gitlab.com', false],
    ['gcr.io', false],
    ['012345678901.dkr.ecr.eu-west-3.amazonaws.com', true],
    ['876820548815.dkr.ecr.cn-north-1.amazonaws.com.cn', true],
    ['390948362332.dkr.ecr.cn-northwest-1.amazonaws.com.cn', true],
    ['public.ecr.aws', true]
  ])('given registry %p', (registry, expected) => {
    expect(aws.isECR(registry)).toEqual(expected);
  });
});

describe('isPubECR', () => {
  test.each([
    ['registry.gitlab.com', false],
    ['gcr.io', false],
    ['012345678901.dkr.ecr.eu-west-3.amazonaws.com', false],
    ['876820548815.dkr.ecr.cn-north-1.amazonaws.com.cn', false],
    ['390948362332.dkr.ecr.cn-northwest-1.amazonaws.com.cn', false],
    ['public.ecr.aws', true]
  ])('given registry %p', (registry, expected) => {
    expect(aws.isPubECR(registry)).toEqual(expected);
  });
});

describe('getRegion', () => {
  test.each([
    ['012345678901.dkr.ecr.eu-west-3.amazonaws.com', 'eu-west-3'],
    ['876820548815.dkr.ecr.cn-north-1.amazonaws.com.cn', 'cn-north-1'],
    ['390948362332.dkr.ecr.cn-northwest-1.amazonaws.com.cn', 'cn-northwest-1'],
    ['public.ecr.aws', 'us-east-1']
  ])('given registry %p', (registry, expected) => {
    expect(aws.getRegion(registry)).toEqual(expected);
  });
});

describe('getAccountIDs', () => {
  beforeEach(() => {
    delete process.env.AWS_ACCOUNT_IDS;
  });

  test.each([
    [
      '012345678901.dkr.ecr.eu-west-3.amazonaws.com',
      undefined,
      ['012345678901']
    ],
    [
      '012345678901.dkr.ecr.eu-west-3.amazonaws.com',
      '012345678910,023456789012',
      ['012345678901', '012345678910', '023456789012']
    ],
    [
      '012345678901.dkr.ecr.eu-west-3.amazonaws.com',
      '012345678901,012345678910,023456789012',
      ['012345678901', '012345678910', '023456789012']
    ],
    [
      '390948362332.dkr.ecr.cn-northwest-1.amazonaws.com.cn',
      '012345678910,023456789012',
      ['390948362332', '012345678910', '023456789012']
    ],
    ['public.ecr.aws', undefined, []]
  ])('given registry %p', (registry, accountIDsEnv, expected) => {
    if (accountIDsEnv) {
      process.env.AWS_ACCOUNT_IDS = accountIDsEnv;
    }
    expect(aws.getAccountIDs(registry)).toEqual(expected);
  });
});

const mockEcrGetAuthToken = jest.fn();
const mockEcrPublicGetAuthToken = jest.fn();

jest.mock('@aws-sdk/client-ecr', () => {
  return {
    ECR: jest.fn(() => ({
      getAuthorizationToken: mockEcrGetAuthToken
    }))
  };
});

jest.mock('@aws-sdk/client-ecr-public', () => {
  return {
    ECRPUBLIC: jest.fn(() => ({
      getAuthorizationToken: mockEcrPublicGetAuthToken
    }))
  };
});

describe('getRegistriesData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AWS_ACCOUNT_IDS;
  });

  test.each([
    [
      '012345678901.dkr.ecr.aws-region-1.amazonaws.com',
      'dkr.ecr.aws-region-1.amazonaws.com',
      undefined,
      [
        {
          registry: '012345678901.dkr.ecr.aws-region-1.amazonaws.com',
          username: '012345678901',
          password: 'world'
        }
      ]
    ],
    [
      '012345678901.dkr.ecr.eu-west-3.amazonaws.com',
      'dkr.ecr.eu-west-3.amazonaws.com',
      '012345678910,023456789012',
      [
        {
          registry: '012345678901.dkr.ecr.eu-west-3.amazonaws.com',
          username: '012345678901',
          password: 'world'
        },
        {
          registry: '012345678910.dkr.ecr.eu-west-3.amazonaws.com',
          username: '012345678910',
          password: 'world'
        },
        {
          registry: '023456789012.dkr.ecr.eu-west-3.amazonaws.com',
          username: '023456789012',
          password: 'world'
        }
      ]
    ],
    [
      'public.ecr.aws',
      undefined,
      undefined,
      [
        {
          registry: 'public.ecr.aws',
          username: 'AWS',
          password: 'world'
        }
      ]
    ]
  ])('given registry %p', async (registry, fqdn, accountIDsEnv, expected) => {
    if (accountIDsEnv) {
      process.env.AWS_ACCOUNT_IDS = accountIDsEnv;
    }

    const accountIDs = aws.getAccountIDs(registry);
    if (accountIDs.length === 0) {
      mockEcrPublicGetAuthToken.mockImplementation(() => {
        return Promise.resolve({
          authorizationData: {
            authorizationToken: Buffer.from('AWS:world').toString('base64')
          }
        });
      });
    } else {
      const authData: AuthorizationData[] = accountIDs.map((accountID) => ({
        authorizationToken: Buffer.from(`${accountID}:world`).toString(
          'base64'
        ),
        proxyEndpoint: `https://${accountID}.${fqdn}`
      }));

      mockEcrGetAuthToken.mockImplementation(() => {
        return Promise.resolve({
          authorizationData: authData
        });
      });
    }

    const regData = await aws.getRegistriesData(registry);
    expect(regData).toEqual(expected);
  });

  test('handles empty authorization data', async () => {
    mockEcrGetAuthToken.mockImplementation(() => {
      return Promise.resolve({
        authorizationData: []
      });
    });

    const regData = await aws.getRegistriesData(
      '012345678901.dkr.ecr.eu-west-3.amazonaws.com'
    );
    expect(regData).toEqual([]);
  });

  test('handles missing authorization token', async () => {
    mockEcrGetAuthToken.mockImplementation(() => {
      return Promise.resolve({
        authorizationData: [
          {
            proxyEndpoint:
              'https://012345678901.dkr.ecr.eu-west-3.amazonaws.com',
            authorizationToken: undefined
          }
        ]
      });
    });

    const regData = await aws.getRegistriesData(
      '012345678901.dkr.ecr.eu-west-3.amazonaws.com'
    );
    expect(regData).toEqual([
      {
        registry: '012345678901.dkr.ecr.eu-west-3.amazonaws.com',
        username: '',
        password: ''
      }
    ]);
  });
});

describe('Authentication Functions', () => {
  describe('login', () => {
    test('validates presence of credentials', async () => {
      const result = await aws.login(undefined, 'password');
      expect(result.success).toBeFalsy();
      expect(result.error).toBe('Username and password are required');
    });

    test('validates credential types', async () => {
      const result = await aws.login(123, 'password');
      expect(result.success).toBeFalsy();
      expect(result.error).toBe('Invalid credentials');
    });

    test('handles valid credentials', async () => {
      const result = await aws.login('validUser', 'validPass');
      expect(result.success).toBeTruthy();
      expect(result.token).toBe('mock-jwt-token');
    });

    test('handles special characters', async () => {
      const result = await aws.login('user@test', 'pass#word');
      expect(result.success).toBeTruthy();
      expect(result.token).toBe('mock-special-token');
    });

    test('handles long credentials', async () => {
      const result = await aws.login('a'.repeat(21), 'b'.repeat(21));
      expect(result.success).toBeTruthy();
      expect(result.token).toBe('mock-long-token');
    });

    test('handles invalid credentials', async () => {
      const result = await aws.login('invalid', 'invalid');
      expect(result.success).toBeFalsy();
      expect(result.error).toBe('Invalid credentials');
    });
  });
});
