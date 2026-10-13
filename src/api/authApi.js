import { requestJson } from './client';

const bearerHeaders = (token) => ({ Authorization: `Bearer ${token}` });

export const login = (credentials) =>
  requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

export const register = (account) =>
  requestJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(account),
  });

export const getCurrentUser = (token) =>
  requestJson('/api/auth/me', { headers: bearerHeaders(token) });

export const updateCurrentUser = (token, profile) =>
  requestJson('/api/auth/me', {
    method: 'PUT',
    headers: bearerHeaders(token),
    body: JSON.stringify(profile),
  });

export const logout = (token) =>
  requestJson('/api/auth/logout', {
    method: 'POST',
    headers: bearerHeaders(token),
  });

export const getAdminUsers = (token) =>
  requestJson('/api/admin/users', { headers: bearerHeaders(token) });
