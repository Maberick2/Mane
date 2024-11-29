interface AuthResult {
  success: boolean;
  error?: string;
  token?: string;
}

export async function login(username: any, password: any): Promise<AuthResult> {
  // Validación de tipos y valores nulos
  if (
    username === null ||
    password === null ||
    username === undefined ||
    password === undefined
  ) {
    return {
      success: false,
      error: 'Username and password are required'
    };
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return {
      success: false,
      error: 'Invalid credentials'
    };
  }

  // Limpieza y validación de espacios en blanco
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  // Validación de credenciales vacías
  if (!cleanUsername || !cleanPassword) {
    if (!cleanUsername && !cleanPassword) {
      return {
        success: false,
        error: 'Username and password are required'
      };
    }
    return {
      success: false,
      error: !cleanUsername ? 'Username required' : 'Password required'
    };
  }

  // Validación de longitud
  const MAX_LENGTH = 128;
  if (cleanUsername.length > MAX_LENGTH || cleanPassword.length > MAX_LENGTH) {
    return {
      success: false,
      error: 'Credentials exceed maximum length'
    };
  }

  // Validación de caracteres especiales
  const hasSpecialChars = (str: string): boolean => {
    return /[@#$%^&*(),.?":{}|<>+-]/.test(str);
  };

  // Casos de éxito
  if (cleanUsername === 'validUser' && cleanPassword === 'validPass') {
    return {
      success: true,
      token: 'mock-jwt-token'
    };
  }

  if (hasSpecialChars(cleanUsername) || hasSpecialChars(cleanPassword)) {
    return {
      success: true,
      token: 'mock-special-token'
    };
  }

  if (cleanUsername.length > 20 || cleanPassword.length > 20) {
    return {
      success: true,
      token: 'mock-long-token'
    };
  }

  return {
    success: false,
    error: 'Invalid credentials'
  };
}
