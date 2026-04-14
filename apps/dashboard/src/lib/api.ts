import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        const locale = getLocaleFromPathname(window.location.pathname);
        window.location.href = `/${locale}/login`;
      }
    }
    return Promise.reject(error);
  }
);

function getLocaleFromPathname(pathname: string) {
  const locale = pathname.split('/')[1];
  return locale === 'en' ? 'en' : 'id';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status?: string;
  roles: string[];
}

export function normalizeUser(user: any): AuthUser {
  const roles = Array.isArray(user?.roles)
    ? user.roles
        .map((role: any) => {
          if (typeof role === 'string') return role;
          return role?.role?.name ?? role?.name ?? null;
        })
        .filter(Boolean)
    : user?.role?.name
      ? [user.role.name]
      : [];

  return {
    id: user?.id ?? '',
    name: user?.name ?? '',
    email: user?.email ?? '',
    status: user?.status,
    roles,
  };
}

export function unwrapApiResponse<T>(response: { data: T | { data: T } }) {
  const payload = response.data as any;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export async function apiGetData<T>(url: string, config?: Parameters<typeof api.get>[1]) {
  const response = await api.get(url, config);
  return unwrapApiResponse<T>(response);
}

export default api;
