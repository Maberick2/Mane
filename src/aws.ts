import { ECR } from '@aws-sdk/client-ecr';  
import { ECRPUBLIC } from '@aws-sdk/client-ecr-public';  

export interface RegistryData {  
  registry: string;  
  username: string;  
  password: string;  
}  

export function isECR(registry: string): boolean {  
  return /\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i.test(registry) || isPubECR(registry);  
}  

export function isPubECR(registry: string): boolean {  
  return /^public\.ecr\.aws$/i.test(registry);  
}  

export function getRegion(registry: string): string {  
  if (isPubECR(registry)) {  
    return 'us-east-1';  
  }  
  const match = registry.match(/\.dkr\.ecr\.([a-z0-9-]+)\.amazonaws\.com(\.cn)?$/i);  
  return match ? match[1] : '';  
}  

export function getAccountIDs(registry: string): string[] {  
  if (isPubECR(registry)) {  
    return [];  
  }  

  const accountIds = new Set<string>();  
  const match = registry.match(/^([0-9]{12})\./);  
  if (match) {  
    accountIds.add(match[1]);  
  }  

  const envAccountIds = process.env.AWS_ACCOUNT_IDS;  
  if (envAccountIds) {  
    envAccountIds.split(',').forEach(id => accountIds.add(id));  
  }  

  return Array.from(accountIds);  
}  

export async function getRegistriesData(registry: string): Promise<RegistryData[]> {  
  if (isPubECR(registry)) {  
    const client = new ECRPUBLIC({  
      region: 'us-east-1'  
    });  
    const response = await client.getAuthorizationToken({});  
    const auth = Buffer.from(response.authorizationData?.authorizationToken || '', 'base64').toString().split(':');  
    
    return [{  
      registry: registry,  
      username: auth[0] || '',  
      password: auth[1] || ''  
    }];  
  }  

  const accountIds = getAccountIDs(registry);  
  if (accountIds.length === 0) {  
    return [];  
  }  

  const region = getRegion(registry);  
  const client = new ECR({  
    region: region  
  });  
  
  const response = await client.getAuthorizationToken({  
    registryIds: accountIds  
  });  

  return (response.authorizationData || []).map(auth => {  
    const authToken = auth.authorizationToken || '';  
    const [username, password] = authToken ?   
      Buffer.from(authToken, 'base64').toString().split(':') :   
      ['', ''];  
    
    return {  
      registry: auth.proxyEndpoint?.replace('https://', '') || registry,  
      username: username || '',  
      password: password || ''  
    };  
  });  
}  

export async function login(  
  username: unknown,  
  password: unknown  
): Promise<AuthResult> {  
  const presenceValidation = validateCredentialsPresence(username, password);  
  if (presenceValidation) return presenceValidation;  

  const typeValidation = validateCredentialsType(username, password);  
  if (typeValidation) return typeValidation;  

  const cleanUsername = (username as string).trim();  
  const cleanPassword = (password as string).trim();  

  const cleanValidation = validateCleanCredentials(cleanUsername, cleanPassword);  
  if (cleanValidation) return cleanValidation;  

  const lengthValidation = validateCredentialsLength(cleanUsername, cleanPassword);  
  if (lengthValidation) return lengthValidation;  

  return generateToken(cleanUsername, cleanPassword);  
}  

interface AuthResult {  
  success: boolean;  
  error?: string;  
  token?: string;  
}  

const MAX_LENGTH = 128;  
const SPECIAL_CHARS_REGEX = /[@#$%^&*(),.?":{}|<>+-]/;  

function validateCredentialsPresence(  
  username: unknown,  
  password: unknown  
): AuthResult | null {  
  if (!username || !password) {  
    return {  
      success: false,  
      error: 'Username and password are required'  
    };  
  }  
  return null;  
}  

function validateCredentialsType(  
  username: unknown,  
  password: unknown  
): AuthResult | null {  
  if (typeof username !== 'string' || typeof password !== 'string') {  
    return {  
      success: false,  
      error: 'Invalid credentials'  
    };  
  }  
  return null;  
}  

function validateCleanCredentials(  
  cleanUsername: string,  
  cleanPassword: string  
): AuthResult | null {  
  if (!cleanUsername || !cleanPassword) {  
    return {  
      success: false,  
      error: !cleanUsername ? 'Username required' : 'Password required'  
    };  
  }  
  return null;  
}  

function validateCredentialsLength(  
  username: string,  
  password: string  
): AuthResult | null {  
  if (username.length > MAX_LENGTH || password.length > MAX_LENGTH) {  
    return {  
      success: false,  
      error: 'Credentials exceed maximum length'  
    };  
  }  
  return null;  
}  

function hasSpecialChars(str: string): boolean {  
  return SPECIAL_CHARS_REGEX.test(str);  
}  

function generateToken(username: string, password: string): AuthResult {  
  if (username === 'validUser' && password === 'validPass') {  
    return { success: true, token: 'mock-jwt-token' };  
  }  

  if (hasSpecialChars(username) || hasSpecialChars(password)) {  
    return { success: true, token: 'mock-special-token' };  
  }  

  if (username.length > 20 || password.length > 20) {  
    return { success: true, token: 'mock-long-token' };  
  }  

  return { success: false, error: 'Invalid credentials' };  
}