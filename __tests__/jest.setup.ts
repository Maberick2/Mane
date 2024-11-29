process.env = {  
  ...process.env,  
  GITHUB_WORKSPACE: process.cwd(),  
  RUNNER_TEMP: '/tmp/github-actions-runner-temp',  
  RUNNER_TOOL_CACHE: '/tmp/github-actions-runner-tool-cache'  
};  

// Mock básico de console para evitar ruido en los tests  
global.console = {  
  ...console,  
  log: jest.fn(),  
  debug: jest.fn(),  
  info: jest.fn(),  
  warn: jest.fn(),  
  error: jest.fn(),  
};