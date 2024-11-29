import * as core from '@actions/core';

export interface Inputs {
  registry: string;
  username: string;
  password: string;
  ecr: string; // 'auto', 'true', o 'false'
  logout: boolean;
}

export function getInputs(): Inputs {
  return {
    registry: core.getInput('registry') || '', // Docker Hub si está vacío
    username: core.getInput('username'),
    password: core.getInput('password'),
    ecr: core.getInput('ecr') || 'auto', // Default a 'auto'
    logout: core.getBooleanInput('logout', { required: false }) || true // Default a true
  };
}
