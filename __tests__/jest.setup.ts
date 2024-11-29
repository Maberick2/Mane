import { jest } from '@jest/globals';

jest.setTimeout(30000);

process.env.GITHUB_REPOSITORY =
  process.env.GITHUB_REPOSITORY || 'docker/login-action';
process.env.RUNNER_TEMP = process.env.RUNNER_TEMP || '/tmp/github_runner';
process.env.RUNNER_TOOL_CACHE =
  process.env.RUNNER_TOOL_CACHE || '/tmp/github_tool_cache';
