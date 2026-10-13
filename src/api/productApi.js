import { requestJson } from './client';

const bearerHeaders = (token) => ({ Authorization: `Bearer ${token}` });

export const getProducts = () => requestJson('/api/products');

export const getAdminProducts = (token) =>
  requestJson('/api/admin/products', { headers: bearerHeaders(token) });

export const saveAdminProduct = (token, product, productId = '') =>
  requestJson(productId ? `/api/admin/products/${productId}` : '/api/admin/products', {
    method: productId ? 'PUT' : 'POST',
    headers: bearerHeaders(token),
    body: JSON.stringify(product),
  });

export const deleteAdminProduct = (token, productId) =>
  requestJson(`/api/admin/products/${productId}`, {
    method: 'DELETE',
    headers: bearerHeaders(token),
  });

export const updateAdminProductStock = (token, productId, quantity) =>
  requestJson(`/api/admin/products/${productId}/stock/${quantity}`, {
    method: 'PATCH',
    headers: bearerHeaders(token),
  });
