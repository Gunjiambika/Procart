import { requestJson } from './client';

const bearerHeaders = (token) => ({ Authorization: `Bearer ${token}` });

export const getCart = (token) =>
  requestJson('/api/cart', { headers: bearerHeaders(token) });

export const addCartItem = (token, item) =>
  requestJson('/api/cart/items', {
    method: 'POST',
    headers: bearerHeaders(token),
    body: JSON.stringify(item),
  });

export const updateCartItemQuantity = (token, productId, quantity) =>
  requestJson(`/api/cart/items/${productId}/${quantity}`, {
    method: 'PATCH',
    headers: bearerHeaders(token),
  });

export const removeCartItem = (token, productId) =>
  requestJson(`/api/cart/items/${productId}`, {
    method: 'DELETE',
    headers: bearerHeaders(token),
  });
