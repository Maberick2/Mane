import { jest } from '@jest/globals';

jest.setTimeout(30000);

// Asegura que las variables de entorno necesarias estén definidas
process.env.RUNNER_TEMP = process.env.RUNNER_TEMP || '/tmp/github_runner';
process.env.RUNNER_TOOL_CACHE =
  process.env.RUNNER_TOOL_CACHE || '/tmp/github_tool_cache';
process.env.NODE_ENV = 'test';
