import React, { createContext, useContext, useState, useCallback } from 'react';

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3000' : '';

interface AuthContextType {
  user: string | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<string | null>(localStorage.getItem('crm_user'));
  const [token, setToken] = useState<string | null>(localStorage.getItem('crm_token'));

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      let errorMessage = 'Credenciales incorrectas';
      if (res.status === 404) {
        errorMessage = 'Error crítico: La ruta de la API no existe (404). Verifica que el backend esté corriendo y correctamente enrutado.';
      } else if (res.status >= 500) {
        errorMessage = 'Error del servidor backend (500+). Revisa los logs de Node.js.';
      } else {
        const data = await res.json().catch(() => ({}));
        errorMessage = data.error || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await res.json();
    localStorage.setItem('crm_user', username);
    localStorage.setItem('crm_token', data.token);
    setUser(username);
    setToken(data.token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_token');
    setUser(null);
    setToken(null);
  }, []);

  // Wrapper de fetch que inyecta el token automáticamente
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const currentToken = localStorage.getItem('crm_token');
    const headers: HeadersInit = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${currentToken}`,
    };

    // No sobreescribir Content-Type si viene de un FormData (multer)
    if (!(options.body instanceof FormData)) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    // Si el token expiró o es inválido, forzar logout
    if (response.status === 401) {
      logout();
      window.location.href = '/login';
    }

    return response;
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
