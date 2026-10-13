export const AUTH_TOKEN_KEY = 'procartAuthToken';
export const ORDER_HISTORY_KEY = 'procartOrderHistory';
export const CATALOG_PRODUCTS_KEY = 'procartCatalogProducts';
export const ADMIN_PRODUCTS_KEY = 'procartAdminProducts';

const PROFILE_DETAILS_KEY_PREFIX = 'procartProfileDetails';

export const readStoredJson = (key, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    return JSON.parse(window.localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};

export const asArray = (value) => (Array.isArray(value) ? value : []);

export const readStoredArray = (key) => asArray(readStoredJson(key, []));

export const defaultProfileDetails = (user = {}) => {
  const account = user || {};

  return {
    name: account.name || 'Demo Shopper',
    email: account.email || 'demo@procart.com',
    phone: account.phone || '+91 98765 43210',
    addressLine: account.address?.line1 || '221B Market Street',
    landmark: account.address?.landmark || 'Near ProCart pickup point',
    city: account.address?.city || 'Bengaluru',
    state: account.address?.state || 'Karnataka',
    pincode: account.address?.pincode || '560001',
  };
};

export const mergeProfileDetails = (user, savedDetails) => ({
  ...defaultProfileDetails(user),
  ...(savedDetails || {}),
});

export const getProfileDetailsKey = (user) =>
  `${PROFILE_DETAILS_KEY_PREFIX}:${user?.id || user?.email || 'guest'}`;

export const getOrderHistoryKey = (user) =>
  `${ORDER_HISTORY_KEY}:${user?.id || user?.email || 'guest'}`;

export const readSavedProfileDetails = (user) =>
  readStoredJson(getProfileDetailsKey(user), null);

export const profileDetailsToUser = (user, details) => ({
  ...(user || {}),
  name: details.name,
  email: details.email,
  phone: details.phone,
  address: {
    line1: details.addressLine,
    landmark: details.landmark,
    city: details.city,
    state: details.state,
    pincode: details.pincode,
  },
});
