import { describe, expect, test } from '@jest/globals';
import * as auth from '../src/auth';

describe('Permission Validation', () => {
  test('handles mixed whitespace and empty credentials', async () => {
    const result1 = await auth.login(' ', '');
    expect(result1.success).toBeFalsy();
    expect(result1.error).toBe('Username and password are required');

    const result2 = await auth.login('', ' ');
    expect(result2.success).toBeFalsy();
    expect(result2.error).toBe('Username and password are required');
  });

  test('handles trimmed empty credentials', async () => {
    const result = await auth.login('  ', '  ');
    expect(result.success).toBeFalsy();
    expect(result.error).toBe('Username and password are required');
  });

  test('validates credential length limits', async () => {
    const longString = 'a'.repeat(129);
    const result1 = await auth.login(longString, 'validPass');
    expect(result1.success).toBeFalsy();

    const result2 = await auth.login('validUser', longString);
    expect(result2.success).toBeFalsy();
  });
});
