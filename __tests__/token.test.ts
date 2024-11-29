import {describe, expect, test} from '@jest/globals';
import * as auth from '../src/auth';

describe('Token Management', () => {
  test('successful login returns valid token', async () => {
    const result = await auth.login('validUser', 'validPass');
    expect(result.success).toBeTruthy();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
  });

  test('failed login does not return token', async () => {
    const result = await auth.login('invalidUser', 'invalidPass');
    expect(result.success).toBeFalsy();
    expect(result.token).toBeUndefined();
  });

  test('token format is valid', async () => {
    const result = await auth.login('validUser', 'validPass');
    expect(result.token).toMatch(/^mock-jwt-token$/);
  });
});
