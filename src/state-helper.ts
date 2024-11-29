import * as core from '@actions/core';

let registry: string;
let logout: boolean;

export function setRegistry(value: string): void {
  registry = value;
  core.saveState('registry', value);
}

export function setLogout(value: boolean): void {
  logout = value;
  core.saveState('logout', value.toString());
}

export function getState(): {registry: string; logout: boolean} {
  return {
    registry: registry || '',
    logout: logout || false
  };
}

// Exportar las variables para que sean accesibles en los tests
export {registry, logout};
