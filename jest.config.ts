import fs from 'fs';  
import os from 'os';  
import path from 'path';  
import type { Config } from '@jest/types';  

const tmpDir = fs.mkdtempSync(  
  path.join(os.tmpdir(), 'docker-login-action-')  
).split(path.sep).join(path.posix.sep);  

process.env = {  
  ...process.env,  
  TEMP: tmpDir,  
  GITHUB_REPOSITORY: 'docker/login-action',  
  RUNNER_TEMP: path.join(tmpDir, 'runner-temp').split(path.sep).join(path.posix.sep),  
  RUNNER_TOOL_CACHE: path.join(tmpDir, 'runner-tool-cache').split(path.sep).join(path.posix.sep)  
};  

const config: Config.InitialOptions = {  
  clearMocks: true,  
  testEnvironment: 'node',  
  moduleFileExtensions: ['js', 'ts'],  
  testMatch: [  
    '**/*.test.ts',  
    '**/*.tests.ts',  
    '**/__tests__/**/*.test.ts',  
    '**/__tests__/**/*.tests.ts',  
    '**/__tests__/integration/**/*.test.ts',  
    '**/__tests__/integration/**/*.tests.ts'  
  ],  
  transform: {  
    '^.+\\.ts$': ['ts-jest', {  
      tsconfig: 'tsconfig.json'  
    }]  
  },  
  moduleNameMapper: {  
    '^csv-parse/sync': '<rootDir>/node_modules/csv-parse/dist/cjs/sync.cjs'  
  },  
  collectCoverageFrom: [  
    'src/**/*.ts',  
    '!src/main.ts',  
    '!src/**/*.d.ts',  
    '!src/**/*.interface.ts'  
  ],  
  coverageDirectory: './coverage',  
  coverageReporters: [  
    'text-summary',  
    'lcov',  
    'html',  
    'json-summary'  
  ],  
  coveragePathIgnorePatterns: [  
    '/node_modules/',  
    '/dist/',  
    '/lib/'  
  ],  
  verbose: true,  
  coverageThreshold: {  
    global: {  
      statements: 70,  
      branches: 70,  
      functions: 70,  
      lines: 70  
    }  
  },  
  testPathIgnorePatterns: [  
    '/node_modules/',  
    '/dist/',  
    '/lib/'  
  ],  
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],  
  testEnvironmentOptions: {  
    url: 'http://localhost'  
  },  
  reporters: [  
    'default',  
    ['jest-junit', {  
      outputDirectory: 'reports',  
      outputName: 'junit.xml',  
      classNameTemplate: '{classname}',  
      titleTemplate: '{title}',  
      ancestorSeparator: ' › ',  
      usePathForSuiteName: true  
    }]  
  ],  
  testTimeout: 30000,  
  setupFilesAfterEnv: ['<rootDir>/__tests__/jest.setup.ts']  
};  

export default config;