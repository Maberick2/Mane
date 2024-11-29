import { jest } from '@jest/globals';  

jest.setTimeout(30000);  

// Configuración global para las pruebas  
process.env.NODE_ENV = 'test';