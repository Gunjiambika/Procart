import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { requestJson } from './api/client';
import * as authApi from './api/authApi';
import * as cartApi from './api/cartApi';
import * as productApi from './api/productApi';
import PasswordField from './components/PasswordField';
import Footer from './components/Footer';
import Header from './components/Header';
import ProductCardView, { ProductQuantityControl } from './components/ProductCard';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import AdminPage from './pages/AdminPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import {
  adminInventoryFilterOptions,
  applyFallbackImage,
  departments,
  featuredProductIds,
  formatPrice,
  getFallbackImage,
  homeHeroImage,
  initialAdminProductForm,
  initialCartItems,
  initialProductFilters,
  marketplaceRows,
  mobileHeroImage,
  navItems,
  orderStatusOptions,
  orderTrackingSteps,
  paymentOptions,
  priceFilterOptions,
  productImage,
  products,
  trendingItems,
} from './data/catalog';
import {
  ADMIN_PRODUCTS_KEY,
  AUTH_TOKEN_KEY,
  CATALOG_PRODUCTS_KEY,
  ORDER_HISTORY_KEY,
  asArray,
  getOrderHistoryKey,
  getProfileDetailsKey,
  mergeProfileDetails,
  profileDetailsToUser,
  readSavedProfileDetails,
  readStoredJson,
  readStoredArray,
} from './utils/accountStorage';

function App() {
  const [view, setView] = useState({ page: 'home' });
  const [searchTerm, setSearchTerm] = useState('');
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [wishlistIds, setWishlistIds] = useState(['summer-dress', 'women-sneakers']);
  const [selectedPaymentId, setSelectedPaymentId] = useState(paymentOptions[0].id);
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [authToken, setAuthToken] = useState(() =>
    typeof window === 'undefined' ? '' : window.localStorage.getItem(AUTH_TOKEN_KEY) || ''
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [authStatus, setAuthStatus] = useState(authToken ? 'checking' : 'guest');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    keepSignedIn: false,
  });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [adminLoginForm, setAdminLoginForm] = useState({
    email: '',
    password: '',
    keepSignedIn: false,
  });
  const [profileDetails, setProfileDetails] = useState(() =>
    mergeProfileDetails(null, null)
  );
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [orderHistory, setOrderHistory] = useState(() => readStoredArray(ORDER_HISTORY_KEY));
  const [catalogProducts, setCatalogProducts] = useState(() => {
    const savedProducts = readStoredArray(CATALOG_PRODUCTS_KEY);
    return savedProducts.length > 0 ? savedProducts : products;
  });
  const [adminProducts, setAdminProducts] = useState(() => readStoredArray(ADMIN_PRODUCTS_KEY));
  const [adminProductForm, setAdminProductForm] = useState(initialAdminProductForm);
  const [adminEditingProductId, setAdminEditingProductId] = useState('');
  const [adminView, setAdminView] = useState('overview');
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminDataError, setAdminDataError] = useState('');
  const [adminFormMessage, setAdminFormMessage] = useState('');
  const [adminFormError, setAdminFormError] = useState('');
  const [adminProductSaving, setAdminProductSaving] = useState(false);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [adminInventoryFilter, setAdminInventoryFilter] = useState('all');
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [cartMessage, setCartMessage] = useState('');
  const [productFilters, setProductFilters] = useState(initialProductFilters);
  const [detailPhotoByProductId, setDetailPhotoByProductId] = useState({});
  const detailCopyRef = useRef(null);
  const syncedCartUserRef = useRef('');
  const [detailPhotoHeight, setDetailPhotoHeight] = useState(null);

  const baseProducts = useMemo(
    () => catalogProducts.filter((product) => !product.adminCreated),
    [catalogProducts]
  );
  const allProducts = useMemo(
    () => [...baseProducts, ...adminProducts],
    [adminProducts, baseProducts]
  );
  const isAdmin = currentUser?.role === 'ADMIN';
  const hasManagedStock = (product) =>
    product?.stockQuantity !== undefined && product?.stockQuantity !== null;
  const getStockQuantity = (product) => Math.max(0, Number(product?.stockQuantity) || 0);
  const isProductAvailable = (product) =>
    !hasManagedStock(product) || getStockQuantity(product) > 0;
  const getStockLabel = (product) => {
    if (!hasManagedStock(product)) {
      return '';
    }

    const stockQuantity = getStockQuantity(product);

    if (stockQuantity === 0) {
      return 'Unavailable';
    }

    if (!isAdmin) {
      return '';
    }

    if (stockQuantity <= 5) {
      return `Only ${stockQuantity} left`;
    }

    return `${stockQuantity} in stock`;
  };
  const cacheProducts = useCallback((key, nextProducts) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(nextProducts));
    }
  }, []);
  const syncAdminProducts = useCallback((nextAdminProducts) => {
    const normalizedAdminProducts = asArray(nextAdminProducts);

    setAdminProducts(normalizedAdminProducts);
    cacheProducts(ADMIN_PRODUCTS_KEY, normalizedAdminProducts);

    setCatalogProducts((current) => {
      const nextCatalogProducts = [
        ...asArray(current).filter((product) => !product.adminCreated),
        ...normalizedAdminProducts,
      ];

      cacheProducts(CATALOG_PRODUCTS_KEY, nextCatalogProducts);
      return nextCatalogProducts;
    });
  }, [cacheProducts]);
  const upsertCatalogProduct = useCallback((product) => {
    if (!product?.id) {
      return;
    }

    setCatalogProducts((current) => {
      const currentProducts = asArray(current);
      const nextProducts = currentProducts.some((item) => item.id === product.id)
        ? currentProducts.map((item) => (item.id === product.id ? product : item))
        : [product, ...currentProducts];

      cacheProducts(CATALOG_PRODUCTS_KEY, nextProducts);
      return nextProducts;
    });
  }, [cacheProducts]);
  const removeCatalogProduct = useCallback((productId) => {
    setCatalogProducts((current) => {
      const nextProducts = asArray(current).filter((product) => product.id !== productId);

      cacheProducts(CATALOG_PRODUCTS_KEY, nextProducts);
      return nextProducts;
    });
  }, [cacheProducts]);
  const getCartQuantity = (productId) =>
    cartItems.find((item) => item.id === productId)?.quantity || 0;
  const isProductUnavailableForCart = (product) =>
    !isProductAvailable(product) ||
    (hasManagedStock(product) && getCartQuantity(product.id) >= getStockQuantity(product));
  const findCartStockIssue = (items) =>
    items.find((product) => hasManagedStock(product) && product.quantity > getStockQuantity(product));
  const getRatingValue = (product) => {
    const rating = Number(product?.rating);
    return Number.isFinite(rating) ? rating : 0;
  };
  const getDepartmentTitle = (departmentId) =>
    departments.find((department) => department.id === departmentId)?.title || 'Marketplace';
  const getOrderStepIndex = (status) => {
    if (status === 'Cancelled') {
      return -1;
    }

    const index = orderTrackingSteps.indexOf(status || 'Confirmed');
    return index >= 0 ? index : 0;
  };
  const applyProductFilters = (sourceProducts) => {
    const filteredProducts = asArray(sourceProducts).filter((product) => {
      const price = Number(product.price) || 0;
      const available = !isProductUnavailableForCart(product);

      if (productFilters.availability === 'available' && !available) {
        return false;
      }

      if (productFilters.availability === 'unavailable' && available) {
        return false;
      }

      if (productFilters.price === 'under-1000' && price >= 1000) {
        return false;
      }

      if (productFilters.price === '1000-5000' && (price < 1000 || price > 5000)) {
        return false;
      }

      if (productFilters.price === '5000-25000' && (price < 5000 || price > 25000)) {
        return false;
      }

      if (productFilters.price === 'above-25000' && price <= 25000) {
        return false;
      }

      return true;
    });

    return [...filteredProducts].sort((first, second) => {
      if (productFilters.sort === 'price-low') {
        return Number(first.price) - Number(second.price);
      }

      if (productFilters.sort === 'price-high') {
        return Number(second.price) - Number(first.price);
      }

      if (productFilters.sort === 'rating') {
        return getRatingValue(second) - getRatingValue(first);
      }

      return 0;
    });
  };

  const cartProducts = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = allProducts.find((currentProduct) => currentProduct.id === item.id);
          return product
            ? { ...product, quantity: Math.max(1, Number(item.quantity) || 1) }
            : null;
        })
        .filter(Boolean),
    [allProducts, cartItems]
  );
  const cartStockIssue = findCartStockIssue(cartProducts);

  const wishlistProducts = useMemo(
    () => wishlistIds.map((id) => allProducts.find((product) => product.id === id)).filter(Boolean),
    [allProducts, wishlistIds]
  );

  const searchOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...allProducts.map((product) => product.name),
          ...allProducts.flatMap((product) => product.keywords || []),
          ...departments.map((department) => department.title),
          ...navItems.map((item) => item.label),
          'Cart',
          'Wishlist',
          'Login',
          'Profile',
          'Account',
          'Admin',
        ])
      ).sort((first, second) => first.localeCompare(second)),
    [allProducts]
  );

  const cartItemCount = cartProducts.reduce((total, product) => total + product.quantity, 0);
  const cartTotal = cartProducts.reduce(
    (total, product) => total + Number(product.price) * product.quantity,
    0
  );
  const areProductFiltersActive = Object.keys(initialProductFilters).some(
    (key) => productFilters[key] !== initialProductFilters[key]
  );
  const cartResponseToItems = (items) =>
    asArray(items).map((item) => ({
      id: item.productId || item.id,
      quantity: Math.max(1, Number(item.quantity) || 1),
    }));
  const isCustomerSession = Boolean(authToken && currentUser && !isAdmin);
  const firstName = currentUser?.name?.split(' ')[0] || 'Shopper';
  const profileAddress = [
    profileDetails.addressLine,
    profileDetails.landmark,
    profileDetails.city,
    profileDetails.state,
    profileDetails.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setProfileDetails(mergeProfileDetails(currentUser, readSavedProfileDetails(currentUser)));
  }, [currentUser]);

  useEffect(() => {
    if (!authToken || currentUser) {
      return undefined;
    }

    let isActive = true;

    const loadCurrentUser = async () => {
      try {
        setAuthStatus('checking');
        const user = await authApi.getCurrentUser(authToken);

        if (isActive) {
          const savedDetails = mergeProfileDetails(user, readSavedProfileDetails(user));

          setProfileDetails(savedDetails);
          setCurrentUser(profileDetailsToUser(user, savedDetails));
          setAuthStatus('signed-in');
        }
      } catch {
        if (isActive) {
          setAuthToken('');
          setCurrentUser(null);
          setAuthStatus('guest');

          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
          }
        }
      }
    };

    loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, [authToken, currentUser]);

  useEffect(() => {
    let isActive = true;

    const loadCatalogProducts = async () => {
      try {
        const productsFromApi = await productApi.getProducts();

        if (isActive && Array.isArray(productsFromApi)) {
          const nextCatalogProducts = productsFromApi.length > 0 ? productsFromApi : products;
          const nextAdminProducts = nextCatalogProducts.filter((product) => product.adminCreated);

          setCatalogProducts(nextCatalogProducts);
          setAdminProducts(nextAdminProducts);
          cacheProducts(CATALOG_PRODUCTS_KEY, nextCatalogProducts);
          cacheProducts(ADMIN_PRODUCTS_KEY, nextAdminProducts);
        }
      } catch {
        const cachedCatalogProducts = readStoredArray(CATALOG_PRODUCTS_KEY);
        const cachedAdminProducts = readStoredArray(ADMIN_PRODUCTS_KEY);

        if (isActive && cachedCatalogProducts.length > 0) {
          setCatalogProducts(cachedCatalogProducts);
        }

        if (isActive && cachedAdminProducts.length > 0) {
          setAdminProducts(cachedAdminProducts);
        }
      }
    };

    loadCatalogProducts();

    return () => {
      isActive = false;
    };
  }, [cacheProducts]);

  useEffect(() => {
    if (!currentUser || isAdmin) {
      return undefined;
    }

    let isActive = true;

    const loadOrderHistory = async () => {
      const cachedHistory = asArray(
        readStoredJson(
          getOrderHistoryKey(currentUser),
          readStoredArray(ORDER_HISTORY_KEY)
        )
      );

      try {
        const orders = await requestJson('/api/orders', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (isActive && Array.isArray(orders)) {
          if (orders.length === 0 && cachedHistory.length === 0) {
            return;
          }

          setOrderHistory(orders);

          if (typeof window !== 'undefined') {
            window.localStorage.setItem(getOrderHistoryKey(currentUser), JSON.stringify(orders));
            window.localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orders));
          }
        }
      } catch {
        if (isActive) {
          setOrderHistory(cachedHistory);
        }
      }
    };

    loadOrderHistory();

    return () => {
      isActive = false;
    };
  }, [authToken, currentUser, isAdmin]);

  useEffect(() => {
    if (!authToken || !isAdmin) {
      setAdminOrders([]);
      setAdminUsers([]);
      return undefined;
    }

    let isActive = true;

    const loadAdminData = async () => {
      const headers = {
        Authorization: `Bearer ${authToken}`,
      };

      try {
        const [productsFromApi, ordersFromApi, usersFromApi] = await Promise.all([
          productApi.getAdminProducts(authToken),
          requestJson('/api/admin/orders', { headers }),
          authApi.getAdminUsers(authToken),
        ]);

        if (!isActive) {
          return;
        }

        if (Array.isArray(productsFromApi)) {
          syncAdminProducts(productsFromApi);
        }

        setAdminOrders(asArray(ordersFromApi));
        setAdminUsers(asArray(usersFromApi));
        setAdminDataError('');
      } catch {
        if (isActive) {
          setAdminDataError('Live admin data is unavailable. Showing cached products where possible.');
        }
      }
    };

    loadAdminData();

    return () => {
      isActive = false;
    };
  }, [authToken, isAdmin, syncAdminProducts]);

  useEffect(() => {
    if (!isCustomerSession) {
      syncedCartUserRef.current = '';
      return undefined;
    }

    const cartSyncKey = currentUser?.id || authToken;

    if (syncedCartUserRef.current === cartSyncKey) {
      return undefined;
    }

    syncedCartUserRef.current = cartSyncKey;
    let isActive = true;

    const syncCustomerCart = async () => {
      try {
        const savedCart = await cartApi.getCart(authToken);

        if (!isActive) {
          return;
        }

        if (Array.isArray(savedCart) && savedCart.length > 0) {
          setCartItems(cartResponseToItems(savedCart));
          return;
        }

        if (cartItems.length === 0) {
          return;
        }

        let latestCart = savedCart;

        for (const item of cartItems) {
          const product = allProducts.find((currentProduct) => currentProduct.id === item.id);

          if (!product) {
            continue;
          }

          latestCart = await cartApi.addCartItem(authToken, {
            productId: product.id,
            quantity: item.quantity,
          });
        }

        if (isActive && Array.isArray(latestCart)) {
          setCartItems(cartResponseToItems(latestCart));
        }
      } catch {
        // Keep the local cart if the persisted cart is unavailable.
      }
    };

    syncCustomerCart();

    return () => {
      isActive = false;
    };
  }, [allProducts, authToken, cartItems, currentUser?.id, isCustomerSession]);

  useEffect(() => {
    if (view.page !== 'product' || typeof window === 'undefined') {
      setDetailPhotoHeight(null);
      return undefined;
    }

    const syncPhotoHeight = () => {
      const nextHeight =
        window.innerWidth > 1180 && detailCopyRef.current
          ? Math.round(detailCopyRef.current.getBoundingClientRect().height)
          : null;

      setDetailPhotoHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight
      );
    };

    syncPhotoHeight();
    window.addEventListener('resize', syncPhotoHeight);

    const detailObserver =
      typeof ResizeObserver !== 'undefined' && detailCopyRef.current
        ? new ResizeObserver(syncPhotoHeight)
        : null;

    if (detailObserver) {
      detailObserver.observe(detailCopyRef.current);
    }

    return () => {
      window.removeEventListener('resize', syncPhotoHeight);

      if (detailObserver) {
        detailObserver.disconnect();
      }
    };
  }, [view.page, view.productId]);

  const resetProductFilters = () => setProductFilters(initialProductFilters);
  const openHome = () => setView({ page: 'home' });
  const openWishlist = () => setView({ page: 'wishlist' });
  const openCart = () => setView({ page: 'cart' });
  const openPayment = () => {
    if (!currentUser || isAdmin) {
      setPendingCheckout(true);
      setAuthError('');
      setAuthMessage('Please login before payment.');
      setAuthMode('login');
      setView({ page: 'login' });
      return;
    }

    setPendingCheckout(false);
    setView({ page: 'payment' });
  };
  const openLogin = () => {
    setAuthMode('login');
    setView({ page: 'login' });
  };
  const openAdminLogin = () => setView({ page: 'admin-login' });
  const openProfile = () => setView({ page: 'profile' });
  const openAdmin = () => setView({ page: 'admin' });
  const openProduct = (productId) => setView({ page: 'product', productId });
  const openDepartment = (departmentId) => {
    resetProductFilters();
    setView({ page: 'department', departmentId });
  };
  const handleFooterNavigate = (target) => {
    if (target.startsWith('department:')) {
      openDepartment(target.split(':')[1]);
    } else if (target === 'cart') {
      openCart();
    } else if (target === 'wishlist') {
      openWishlist();
    } else if (target === 'profile') {
      currentUser ? openProfile() : openLogin();
    } else if (target === 'login') {
      openLogin();
    } else {
      openHome();
    }

    scrollToTop();
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      openDepartment('all');
      return;
    }

    if (query === 'cart') {
      openCart();
      return;
    }

    if (query === 'wishlist') {
      openWishlist();
      return;
    }

    if (query === 'login') {
      currentUser ? openProfile() : openLogin();
      return;
    }

    if (query === 'profile' || query === 'account') {
      currentUser ? openProfile() : openLogin();
      return;
    }

    if (query === 'admin') {
      isAdmin ? openAdmin() : openAdminLogin();
      return;
    }

    const matchedDepartment = departments.find(
      (department) => department.id === query || department.title.toLowerCase() === query
    );

    if (matchedDepartment) {
      openDepartment(matchedDepartment.id);
      return;
    }

    if (query.includes('deal')) {
      openDepartment('all');
      return;
    }

    resetProductFilters();
    setView({ page: 'search', query });
  };

  const handleLoginChange = (event) => {
    const { name, type, checked, value } = event.target;

    setLoginForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;

    setRegisterForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAdminLoginChange = (event) => {
    const { name, type, checked, value } = event.target;

    setAdminLoginForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleProfileDetailChange = (event) => {
    const { name, value } = event.target;

    setProfileDetails((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAdminProductChange = (event) => {
    const { name, value } = event.target;

    setAdminProductForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleProductFilterChange = (event) => {
    const { name, value } = event.target;

    setProductFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const startProfileEdit = () => {
    setAuthMessage('');
    setIsProfileEditing(true);
  };

  const cancelProfileEdit = () => {
    setProfileDetails(mergeProfileDetails(currentUser, readSavedProfileDetails(currentUser)));
    setAuthMessage('');
    setIsProfileEditing(false);
  };

  const saveProfileDetails = async (event) => {
    event.preventDefault();
    const nextDetails = {
      ...profileDetails,
      name: profileDetails.name.trim() || currentUser.name,
      email: profileDetails.email.trim() || currentUser.email,
      phone: profileDetails.phone.trim(),
      addressLine: profileDetails.addressLine.trim(),
      landmark: profileDetails.landmark.trim(),
      city: profileDetails.city.trim(),
      state: profileDetails.state.trim(),
      pincode: profileDetails.pincode.trim(),
    };
    let nextUser = profileDetailsToUser(currentUser, nextDetails);

    if (authToken) {
      try {
        const savedUser = await authApi.updateCurrentUser(authToken, {
            name: nextDetails.name,
            email: nextDetails.email,
            phone: nextDetails.phone,
            address: {
              line1: nextDetails.addressLine,
              landmark: nextDetails.landmark,
              city: nextDetails.city,
              state: nextDetails.state,
              pincode: nextDetails.pincode,
            },
        });

        nextUser = profileDetailsToUser(savedUser, mergeProfileDetails(savedUser, nextDetails));
      } catch {
     
      }
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(getProfileDetailsKey(currentUser), JSON.stringify(nextDetails));
    }

    setProfileDetails(nextDetails);
    setCurrentUser(nextUser);
    setAuthMessage('Profile details saved.');
    setIsProfileEditing(false);
  };

  const addAdminProduct = async (event) => {
    event.preventDefault();
    setAdminFormMessage('');
    setAdminFormError('');

    if (!isAdmin) {
      setAdminFormError('Admin access is required.');
      return;
    }

    const name = adminProductForm.name.trim();
    const price = Number(adminProductForm.price);
    const mrp = Number(adminProductForm.mrp || adminProductForm.price);
    const stockQuantity = Math.max(0, Number(adminProductForm.stockQuantity) || 0);

    if (!name || !adminProductForm.department || !price || price <= 0) {
      setAdminFormError('Name, department and a valid price are required.');
      return;
    }

    const idBase = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const id = adminEditingProductId || `admin-${idBase || 'product'}-${Date.now()}`;
    const details =
      adminProductForm.details.trim() || `${name} added by the ProCart admin team.`;
    const specs = adminProductForm.specs
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const keywords = adminProductForm.keywords
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const image =
      adminProductForm.image.trim() || productImage(`${adminProductForm.department} ${name}`, Date.now());
    let nextProduct = {
      id,
      name,
      department: adminProductForm.department,
      image,
      gallery: [image],
      price,
      mrp: mrp > 0 ? mrp : price,
      rating: 'New',
      reviews: '0',
      badge: adminProductForm.badge.trim() || 'Admin pick',
      details,
      specs: specs.length > 0 ? specs : ['Admin added', 'Fresh listing', 'Ready to ship'],
      keywords: keywords.length > 0 ? keywords : [name, adminProductForm.department],
      stockQuantity,
      adminCreated: true,
    };

    if (!authToken) {
      setAdminFormError('Please sign in as admin and start the backend before saving products.');
      return;
    }

    setAdminProductSaving(true);

    try {
      nextProduct = await productApi.saveAdminProduct(
        authToken,
        nextProduct,
        adminEditingProductId
      );

      if (!nextProduct?.id) {
        setAdminFormError('The product was not saved because the API did not return a product record.');
        return;
      }

      setAdminProducts((current) => {
        const existingProducts = asArray(current);
        const nextProducts = adminEditingProductId
          ? existingProducts.map((product) =>
              product.id === adminEditingProductId ? nextProduct : product
            )
          : [nextProduct, ...existingProducts.filter((product) => product.id !== nextProduct.id)];

        cacheProducts(ADMIN_PRODUCTS_KEY, nextProducts);
        return nextProducts;
      });
      upsertCatalogProduct(nextProduct);
      setAdminEditingProductId('');
      setAdminProductForm(initialAdminProductForm);
      setAdminFormMessage(
        `${nextProduct.name} was ${adminEditingProductId ? 'updated' : 'added'} and saved to the database.`
      );
    } catch (error) {
      setAdminFormError(error.message || 'Product could not be saved to the database.');
    } finally {
      setAdminProductSaving(false);
    }
  };

  const editAdminProduct = (product) => {
    setAdminEditingProductId(product.id);
    setAdminProductForm({
      name: product.name || '',
      department: product.department || 'accessories',
      price: product.price || '',
      mrp: product.mrp || '',
      badge: product.badge || 'Admin pick',
      image: product.image || '',
      details: product.details || '',
      stockQuantity: String(product.stockQuantity ?? 0),
      specs: asArray(product.specs).join(', '),
      keywords: asArray(product.keywords).join(', '),
    });
    setAdminFormMessage('');
    setAdminFormError('');
    setAdminView('products');
  };

  const cancelAdminProductEdit = () => {
    setAdminEditingProductId('');
    setAdminProductForm(initialAdminProductForm);
    setAdminFormMessage('');
    setAdminFormError('');
  };

  const deleteAdminProduct = async (productId) => {
    const product = adminProducts.find((item) => item.id === productId);

    setAdminFormMessage('');
    setAdminFormError('');

    if (!product) {
      return;
    }

    const removeProduct = () => {
      setAdminProducts((current) => {
        const nextProducts = asArray(current).filter((item) => item.id !== productId);

        cacheProducts(ADMIN_PRODUCTS_KEY, nextProducts);
        return nextProducts;
      });
      removeCatalogProduct(productId);
    };

    if (!authToken) {
      setAdminFormError('Please sign in as admin and start the backend before deleting products.');
      return;
    }

    try {
      await productApi.deleteAdminProduct(authToken, productId);

      removeProduct();
      setCartItems((current) => current.filter((item) => item.id !== productId));
      setAdminFormMessage(`${product.name} was removed from the database.`);
    } catch (error) {
      setAdminFormError(error.message || 'Product could not be removed from the database.');
    }
  };

  const updateAdminOrderStatus = async (orderId, status) => {
    const applyOrder = (updatedOrder) => {
      setAdminOrders((current) =>
        asArray(current).map((order) =>
          order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
        )
      );
    };

    setAdminFormMessage('');
    setAdminFormError('');

    if (!authToken) {
      setAdminFormError('Please sign in as admin and start the backend before updating orders.');
      return;
    }

    try {
      const updatedOrder = await requestJson(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      });

      applyOrder(updatedOrder);
      setAdminFormMessage(`Order ${updatedOrder.id} moved to ${updatedOrder.status}.`);
    } catch (error) {
      setAdminFormError(error.message || 'Order status could not be saved to the database.');
    }
  };

  const updateAdminProductStock = async (productId, nextStockQuantity) => {
    const stockQuantity = Math.max(0, Number(nextStockQuantity) || 0);
    const currentProduct = allProducts.find((product) => product.id === productId);
    const isAdminProduct = adminProducts.some((product) => product.id === productId);
    const applyUpdatedProduct = (updatedProduct) => {
      if (!updatedProduct?.id) {
        return false;
      }

      const mergedProduct = { ...(currentProduct || {}), ...updatedProduct };

      if (isAdminProduct || mergedProduct.adminCreated) {
        setAdminProducts((current) => {
          const nextProducts = asArray(current).map((product) =>
            product.id === mergedProduct.id ? mergedProduct : product
          );

          cacheProducts(ADMIN_PRODUCTS_KEY, nextProducts);
          return nextProducts;
        });
      }

      upsertCatalogProduct(mergedProduct);

      return true;
    };

    setAdminFormMessage('');
    setAdminFormError('');

    if (!currentProduct) {
      setAdminFormError('Product was not found in the catalog.');
      return;
    }

    if (!authToken) {
      setAdminFormError('Please sign in as admin and start the backend before updating stock.');
      return;
    }

    try {
      const updatedProduct = await productApi.updateAdminProductStock(
        authToken,
        productId,
        stockQuantity
      );

      if (updatedProduct?.id === productId && applyUpdatedProduct(updatedProduct)) {
        setAdminFormMessage(`${updatedProduct.name || currentProduct.name} stock updated.`);
        return;
      }

      setAdminFormError('Stock was not updated because the API did not return a product record.');
    } catch (error) {
      setAdminFormError(error.message || 'Stock could not be saved to the database.');
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthMessage('');
    setAuthStatus('loading');

    try {
      const payload = await authApi.login({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (payload.user.role === 'ADMIN') {
        throw new Error('Use the admin login page for admin accounts.');
      }

      const nextDetails = mergeProfileDetails(payload.user, readSavedProfileDetails(payload.user));

      setAuthToken(payload.token);
      setCurrentUser(profileDetailsToUser(payload.user, nextDetails));
      setProfileDetails(nextDetails);
      setIsProfileEditing(false);
      setAuthStatus('signed-in');
      setAuthMessage(`Welcome back, ${payload.user.name}.`);
      setView({ page: pendingCheckout ? 'payment' : 'profile' });
      setPendingCheckout(false);

      if (typeof window !== 'undefined') {
        if (loginForm.keepSignedIn) {
          window.localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
        } else {
          window.localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      }
    } catch (error) {
      setCurrentUser(null);
      setAuthToken('');
      setAuthStatus('guest');
      setAuthError(error.message);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthMessage('');
    setAuthStatus('loading');

    const name = registerForm.name.trim();
    const email = registerForm.email.trim();
    const password = registerForm.password;
    const phone = registerForm.phone.trim();

    if (!name || !email || !password) {
      setAuthStatus('guest');
      setAuthError('Name, email and password are required to create an account.');
      return;
    }

    try {
      const payload = await authApi.register({ name, email, password, phone });

      const nextDetails = mergeProfileDetails(payload.user, readSavedProfileDetails(payload.user));

      setAuthToken(payload.token);
      setCurrentUser(profileDetailsToUser(payload.user, nextDetails));
      setProfileDetails(nextDetails);
      setIsProfileEditing(false);
      setAuthStatus('signed-in');
      setAuthMessage(`Account created. Welcome, ${payload.user.name}.`);
      setRegisterForm({
        name: '',
        email: '',
        password: '',
        phone: '',
      });
      setView({ page: pendingCheckout ? 'payment' : 'profile' });
      setPendingCheckout(false);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
      }
    } catch (error) {
      setCurrentUser(null);
      setAuthToken('');
      setAuthStatus('guest');
      setAuthError(error.message);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthMessage('');
    setAuthStatus('loading');

    try {
      const payload = await authApi.login({
        email: adminLoginForm.email,
        password: adminLoginForm.password,
      });

      if (payload.user.role !== 'ADMIN') {
        throw new Error('Use an admin account to access the admin console.');
      }

      const nextDetails = mergeProfileDetails(payload.user, readSavedProfileDetails(payload.user));

      setAuthToken(payload.token);
      setCurrentUser(profileDetailsToUser(payload.user, nextDetails));
      setProfileDetails(nextDetails);
      setIsProfileEditing(false);
      setAuthStatus('signed-in');
      setAuthMessage(`Welcome back, ${payload.user.name}.`);
      setView({ page: 'admin' });

      if (typeof window !== 'undefined') {
        if (adminLoginForm.keepSignedIn) {
          window.localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
        } else {
          window.localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      }
    } catch (error) {
      setCurrentUser(null);
      setAuthToken('');
      setAuthStatus('guest');
      setAuthError(error.message);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
  };

  const handleLogout = async () => {
    const tokenToRevoke = authToken;

    setAuthError('');
    setAuthMessage('');

    try {
      if (tokenToRevoke) {
        await authApi.logout(tokenToRevoke);
      }
    } catch {
      
    } finally {
      setAuthToken('');
      setCurrentUser(null);
      setAuthStatus('guest');
      setAuthMessage('Signed out.');
      setIsProfileEditing(false);
      setPendingCheckout(false);
      setCartItems([]);
      setCartMessage('');
      syncedCartUserRef.current = '';

      if (view.page === 'profile') {
        setView({ page: 'login' });
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
  };

  const addToCart = async (productId) => {
    const product = allProducts.find((item) => item.id === productId);
    const stockQuantity = getStockQuantity(product);
    const cartQuantity = getCartQuantity(productId);

    if (!product) {
      return false;
    }

    if (!isProductAvailable(product)) {
      setCartMessage(`${product.name} is currently unavailable.`);
      return false;
    }

    if (hasManagedStock(product) && cartQuantity >= stockQuantity) {
      setCartMessage(`${product.name} is unavailable for additional quantity.`);
      return false;
    }

    setCartMessage('');

    setCartItems((current) => {
      const existingItem = current.find((item) => item.id === productId);

      if (!existingItem) {
        return [...current, { id: productId, quantity: 1 }];
      }

      return current.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
      );
    });

    if (isCustomerSession && product) {
      try {
        const savedCart = await cartApi.addCartItem(authToken, {
          productId: product.id,
          quantity: 1,
        });

        setCartItems(cartResponseToItems(savedCart));
      } catch {
      }
    }

    return true;
  };

  const decreaseCartQuantity = async (productId) => {
    const nextQuantity = Math.max(0, getCartQuantity(productId) - 1);
    setCartMessage('');

    setCartItems((current) =>
      current
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity - 1) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );

    if (isCustomerSession) {
      try {
        const savedCart = await cartApi.updateCartItemQuantity(
          authToken,
          productId,
          nextQuantity
        );

        setCartItems(cartResponseToItems(savedCart));
      } catch {
       
      }
    }
  };

  const removeFromCart = async (productId) => {
    setCartMessage('');
    setCartItems((current) => current.filter((item) => item.id !== productId));

    if (isCustomerSession) {
      try {
        const savedCart = await cartApi.removeCartItem(authToken, productId);

        setCartItems(cartResponseToItems(savedCart));
      } catch {
       
      }
    }
  };

  const buyNow = async (productId) => {
    const added = await addToCart(productId);

    if (added) {
      openPayment();
    }
  };

  const placeOrder = async (event) => {
    event.preventDefault();

    if (!currentUser || isAdmin) {
      openPayment();
      return;
    }

    if (cartProducts.length === 0) {
      openCart();
      return;
    }

    const stockIssue = findCartStockIssue(cartProducts);

    if (stockIssue) {
      setCartMessage(
        `${stockIssue.name} is unavailable in the requested quantity. Update your cart before payment.`
      );
      openCart();
      return;
    }

    const selectedPayment = paymentOptions.find((option) => option.id === selectedPaymentId);
    const receipt = {
      id: `PC${Math.floor(100000 + Math.random() * 900000)}`,
      itemCount: cartItemCount,
      total: cartTotal,
      paymentTitle: selectedPayment?.title || paymentOptions[0].title,
      placedAt: new Date().toISOString(),
      status: 'Confirmed',
      deliveryAddress: profileAddress,
      items: cartProducts.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: product.quantity,
      })),
    };
    let savedReceipt = receipt;

    if (authToken) {
      try {
        savedReceipt = await requestJson('/api/orders', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(receipt),
        });
      } catch (error) {
        if (error.status) {
          setCartMessage('One or more products are unavailable in the requested quantity.');
          openCart();
          return;
        }

      }
    }

    setOrderReceipt(savedReceipt);
    setOrderHistory((current) => {
      const nextHistory = [
        savedReceipt,
        ...asArray(current).filter((order) => order.id !== savedReceipt.id),
      ].slice(0, 12);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(getOrderHistoryKey(currentUser), JSON.stringify(nextHistory));
        window.localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(nextHistory));
      }

      return nextHistory;
    });
    setCartItems([]);
    setView({ page: 'order-confirmation' });
  };

  const toggleWishlist = (productId) => {
    setWishlistIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  };

  const moveWishlistToCart = async () => {
    const productsToMove = wishlistProducts.filter((product) => !isProductUnavailableForCart(product));

    for (const product of productsToMove) {
      await addToCart(product.id);
    }

    if (productsToMove.length > 0) {
      setWishlistIds((current) =>
        current.filter((id) => !productsToMove.some((product) => product.id === id))
      );
    }
  };

  const getProductsByIds = (productIds) =>
    productIds.map((id) => allProducts.find((product) => product.id === id)).filter(Boolean);

  const getRelatedProducts = (product) =>
    allProducts
      .filter((item) => item.id !== product.id && item.department === product.department)
      .slice(0, 4);

  const renderRelatedProducts = (product) => {
    const relatedProducts = getRelatedProducts(product);

    if (relatedProducts.length === 0) {
      return null;
    }

    return (
      <section className="related-products-section" aria-label={`${product.name} related products`}>
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Related products</p>
            <h2>You may also like</h2>
          </div>
        </div>
        <section className="products small-products" aria-label="Related products">
          {relatedProducts.map((relatedProduct) => (
            <ProductCard product={relatedProduct} key={relatedProduct.id} />
          ))}
        </section>
      </section>
    );
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const ProductFilterBar = ({ resultCount, totalCount }) => (
    <section className="product-filter-bar" aria-label="Product filters">
      <div>
        <span>
          {resultCount} of {totalCount} products
        </span>
        <strong>Refine catalog</strong>
        {areProductFiltersActive && (
          <button type="button" onClick={resetProductFilters}>
            Clear filters
          </button>
        )}
      </div>
      <label>
        Availability
        <select
          name="availability"
          value={productFilters.availability}
          onChange={handleProductFilterChange}
        >
          <option value="all">All stock</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </label>
      <label>
        Price
        <select name="price" value={productFilters.price} onChange={handleProductFilterChange}>
          {priceFilterOptions.map((option) => (
            <option value={option.id} key={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sort
        <select name="sort" value={productFilters.sort} onChange={handleProductFilterChange}>
          <option value="featured">Featured</option>
          <option value="price-low">Price: low to high</option>
          <option value="price-high">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </label>
    </section>
  );

  const OrderTracker = ({ status }) => {
    const currentStep = getOrderStepIndex(status);
    const isCancelled = status === 'Cancelled';

    return (
      <div className={`order-tracker${isCancelled ? ' cancelled' : ''}`} aria-label="Order tracking">
        {(isCancelled ? ['Confirmed', 'Cancelled'] : orderTrackingSteps).map((step, index) => (
          <span
            className={!isCancelled && index <= currentStep ? 'active' : ''}
            key={step}
          >
            {step}
          </span>
        ))}
      </div>
    );
  };

  const ProductCard = ({ product }) => {
    const cartQuantity = getCartQuantity(product.id);
    const isSaved = wishlistIds.includes(product.id);
    const stockQuantity = getStockQuantity(product);
    const stockLabel = getStockLabel(product);
    const isUnavailableForCart = isProductUnavailableForCart(product);

    return (
      <ProductCardView
        product={product}
        cartQuantity={cartQuantity}
        hasStockLimit={hasManagedStock(product)}
        isSaved={isSaved}
        stockQuantity={stockQuantity}
        stockLabel={stockLabel}
        showStockDetails={isAdmin}
        isUnavailableForCart={isUnavailableForCart}
        onOpen={() => openProduct(product.id)}
        onDecrease={() => decreaseCartQuantity(product.id)}
        onIncrease={() => addToCart(product.id)}
        onToggleWishlist={() => toggleWishlist(product.id)}
      />
    );
  };

  const renderTrendingStrip = () => (
    <section className="trending-strip" aria-label="Trending now">
      <div className="trending-track">
        {[...trendingItems, ...trendingItems].map((item, index) => (
          <span className="trending-pill" key={`${item}-${index}`}>
            <span>Trending now</span>
            {item}
          </span>
        ))}
      </div>
    </section>
  );

  const renderHome = () => (
    <>
      <section className="hero" aria-label="ProCart festival sale">
        <picture>
          <source media="(max-width: 820px)" srcSet={mobileHeroImage} />
          <img
            src={homeHeroImage}
            alt="ProCart home page sale"
            onError={(event) => applyFallbackImage(event)}
          />
        </picture>
        <div className="hero-content">
          <p className="eyebrow">ProCart Mega Days</p>
          <h1>Shop the deals everyone is talking about</h1>
          <p>Fresh electronics, fashion, home picks and daily essentials with fast delivery.</p>
          <button className="primary-action" type="button" onClick={() => openDepartment('all')}>
            Start shopping
          </button>
        </div>
      </section>

      {renderTrendingStrip()}

      <section className="promo-wall" aria-label="Featured shopping banners">
        <article className="promo-card hero-promo">
          <img
            src={productImage('online shopping delivery ecommerce products', 902)}
            alt=""
            onError={(event) => applyFallbackImage(event)}
          />
          <div>
            <p className="eyebrow">Mega marketplace</p>
            <h2>Everything you need, delivered fast</h2>
            <button type="button" onClick={() => openDepartment('all')}>
              Explore deals
            </button>
          </div>
        </article>
        <article className="promo-card">
          <img
            src={productImage('fashion clothing sale products', 903)}
            alt=""
            onError={(event) => applyFallbackImage(event, getFallbackImage('men'))}
          />
          <div>
            <h2>Fashion week picks</h2>
            <button type="button" onClick={() => openDepartment('men')}>
              Shop fashion
            </button>
          </div>
        </article>
        <article className="promo-card">
          <img
            src={productImage('beauty products makeup sale', 904)}
            alt=""
            onError={(event) => applyFallbackImage(event, getFallbackImage('beauty'))}
          />
          <div>
            <h2>Beauty under budget</h2>
            <button type="button" onClick={() => openDepartment('beauty')}>
              Shop beauty
            </button>
          </div>
        </article>
      </section>

      <section className="quick-panels" aria-label="Featured departments">
        {departments.map((department) => (
          <article className="department-card" key={department.id}>
            <h2>{department.title}</h2>
            <img
              src={department.image}
              alt=""
              onError={(event) => applyFallbackImage(event, getFallbackImage(department.id))}
            />
            <p>{department.copy}</p>
            <button type="button" onClick={() => openDepartment(department.id)}>
              Shop {department.title}
            </button>
          </article>
        ))}
      </section>

      {marketplaceRows.map((row) => (
        <section className="deal-section" aria-label={row.title} key={row.title}>
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">{row.subtitle}</p>
              <h2>{row.title}</h2>
            </div>
            <button type="button" onClick={() => openDepartment('all')}>
              See all
            </button>
          </div>
          <div className="deal-rail">
            {getProductsByIds(row.productIds).map((product) => (
              <button
                className="mini-product"
                type="button"
                onClick={() => openProduct(product.id)}
                key={product.id}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  onError={(event) => applyFallbackImage(event, getFallbackImage(product.department))}
                />
                <span>{product.name}</span>
                <strong>{formatPrice(product.price)}</strong>
              </button>
            ))}
          </div>
        </section>
      ))}

      {adminProducts.length > 0 && (
        <section className="deal-section" aria-label="Admin added products">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Admin additions</p>
              <h2>New products from ProCart admin</h2>
            </div>
            <button type="button" onClick={() => openDepartment('all')}>
              See all
            </button>
          </div>
          <div className="deal-rail">
            {adminProducts.slice(0, 8).map((product) => (
              <button
                className="mini-product"
                type="button"
                onClick={() => openProduct(product.id)}
                key={product.id}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  onError={(event) => applyFallbackImage(event, getFallbackImage(product.department))}
                />
                <span>{product.name}</span>
                <strong>{formatPrice(product.price)}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="storefront" id="deals">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Featured products</p>
          <h2>Deals inspired by marketplace shopping</h2>
          </div>
          <button type="button" onClick={() => openDepartment('all')}>
            View all products
          </button>
        </div>

        <section className="products" aria-label="Products">
          {getProductsByIds(featuredProductIds).map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </section>
      </section>
    </>
  );

  const renderDepartment = () => {
    const department = departments.find((item) => item.id === view.departmentId);
    const departmentProducts =
      view.departmentId === 'all'
        ? allProducts
        : allProducts.filter(
            (product) =>
              product.department === view.departmentId || department?.productIds.includes(product.id)
          );
    const filteredProducts = applyProductFilters(departmentProducts);
    const pageTitle =
      view.departmentId === 'all' ? "Today's Deals" : department ? department.title : 'Products';

    return (
      <section className="page-view">
        <div className="page-title">
          <p className="eyebrow">{view.departmentId === 'all' ? 'Fresh offers' : 'Department'}</p>
          <h1>{pageTitle}</h1>
          <button type="button" onClick={openHome}>
            Back home
          </button>
        </div>
        <ProductFilterBar
          resultCount={filteredProducts.length}
          totalCount={departmentProducts.length}
        />
        {filteredProducts.length > 0 ? (
          <section className="products" aria-label={`${department ? department.title : 'All'} products`}>
            {filteredProducts.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </section>
        ) : (
          <div className="empty-state">
            <h2>No products match</h2>
            <p>Try changing availability, price or sort filters.</p>
          </div>
        )}
      </section>
    );
  };

  const renderSearch = () => {
    const matchedProducts = allProducts.filter((product) => {
      const department = departments.find((item) => item.id === product.department);
      const text = [
        product.name,
        product.details,
        product.department,
        department?.title,
        product.badge,
        ...(product.keywords || []),
        ...product.specs,
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(view.query);
    });
    const filteredProducts = applyProductFilters(matchedProducts);

    return (
      <section className="page-view">
        <div className="page-title">
          <p className="eyebrow">Search</p>
          <h1>Results for "{view.query}"</h1>
          <button type="button" onClick={openHome}>
            Back home
          </button>
        </div>
        {matchedProducts.length > 0 && (
          <ProductFilterBar
            resultCount={filteredProducts.length}
            totalCount={matchedProducts.length}
          />
        )}
        {filteredProducts.length > 0 ? (
          <section className="products" aria-label="Search products">
            {filteredProducts.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </section>
        ) : (
          <div className="empty-state">
            <h2>No products found</h2>
            <p>
              {matchedProducts.length > 0
                ? 'Try changing availability, price or sort filters.'
                : 'Try searching for laptop, mobile, shoes, watch or headphones.'}
            </p>
          </div>
        )}
      </section>
    );
  };

  const renderProductPage = () => {
    const product = allProducts.find((item) => item.id === view.productId) || allProducts[0];
    const isSaved = wishlistIds.includes(product.id);
    const cartQuantity = getCartQuantity(product.id);
    const stockQuantity = getStockQuantity(product);
    const stockLabel = getStockLabel(product);
    const isAtStockLimit = hasManagedStock(product) && cartQuantity >= stockQuantity;
    const isUnavailableForCart = isProductUnavailableForCart(product);
    const displayStockLabel = isUnavailableForCart ? 'Unavailable' : stockLabel;
    const galleryImages = Array.from(new Set([product.image, ...asArray(product.gallery)])).filter(Boolean);
    const selectedPhoto = detailPhotoByProductId[product.id] || galleryImages[0] || product.image;

    return (
      <section className="page-view">
        <button className="back-button" type="button" onClick={openHome}>
          Back to home
        </button>

        <div className={`product-detail${isUnavailableForCart ? ' stock-unavailable-detail' : ''}`}>
          <div className="product-gallery">
            <img
              className="main-photo"
              src={selectedPhoto}
              alt={product.name}
              style={detailPhotoHeight ? { height: `${detailPhotoHeight}px` } : undefined}
              onError={(event) => applyFallbackImage(event, getFallbackImage(product.department))}
            />
            {galleryImages.length > 1 && (
              <div className="gallery-thumbnails" aria-label={`${product.name} gallery`}>
                {galleryImages.map((image, index) => (
                  <button
                    className={selectedPhoto === image ? 'active' : ''}
                    type="button"
                    onClick={() =>
                      setDetailPhotoByProductId((current) => ({
                        ...current,
                        [product.id]: image,
                      }))
                    }
                    key={`${image}-${index}`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} view ${index + 1}`}
                      onError={(event) => applyFallbackImage(event, getFallbackImage(product.department))}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="detail-copy" ref={detailCopyRef}>
            <span className="product-badge static-badge">{product.badge}</span>
            <h1>{product.name}</h1>
            <div className="rating" aria-label={`${product.rating} stars`}>
              <span>{product.rating}</span>
              <span className="stars">*****</span>
              <strong>{product.reviews} reviews</strong>
            </div>
            <p>{product.details}</p>
            <div className="detail-meta-grid" aria-label={`${product.name} shopping details`}>
              <div>
                <span>Category</span>
                <strong>{getDepartmentTitle(product.department)}</strong>
              </div>
              <div>
                <span>Brand</span>
                <strong>{product.adminCreated ? 'ProCart Admin' : 'ProCart Select'}</strong>
              </div>
              <div>
                <span>Warranty</span>
                <strong>1 year support</strong>
              </div>
              <div>
                <span>Returns</span>
                <strong>7 day replacement</strong>
              </div>
            </div>
            <div className="price-row detail-price">
              <strong>{formatPrice(product.price)}</strong>
              <span>{formatPrice(product.mrp)}</span>
            </div>
            {displayStockLabel && (
              <p className={`stock-status${isUnavailableForCart ? ' unavailable' : ''}`}>
                {displayStockLabel}
              </p>
            )}
            <ul className="spec-list">
              {product.specs.map((spec) => (
                <li key={spec}>{spec}</li>
              ))}
            </ul>
            <div className="detail-actions">
              <ProductQuantityControl
                product={product}
                cartQuantity={cartQuantity}
                stockQuantity={stockQuantity}
                hasStockLimit={hasManagedStock(product)}
                isUnavailableForCart={isUnavailableForCart}
                showStockDetails={isAdmin}
                onDecrease={() => decreaseCartQuantity(product.id)}
                onIncrease={() => addToCart(product.id)}
                className="detail-stepper"
              />
              <button
                className="secondary-action"
                type="button"
                onClick={() => toggleWishlist(product.id)}
              >
                {isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
              </button>
            </div>
          </div>

          <aside className="buy-box">
            <h2>{formatPrice(product.price)}</h2>
            <p className={isUnavailableForCart ? 'stock-status unavailable' : 'cart-ready'}>
              {isUnavailableForCart ? 'Currently unavailable' : 'Free delivery by tomorrow'}
            </p>
            <p>Pay on delivery. Secure packaging. Easy replacement available.</p>
            <div className="product-assurance" aria-label="Purchase assurance">
              <span>Secure checkout</span>
              <span>Fast dispatch</span>
              <span>Replacement support</span>
            </div>
            <button type="button" onClick={() => buyNow(product.id)} disabled={isUnavailableForCart}>
              {isUnavailableForCart ? 'Unavailable' : 'Buy now'}
            </button>
            {isAtStockLimit && (
              <ProductQuantityControl
                product={product}
                cartQuantity={cartQuantity}
                stockQuantity={stockQuantity}
                hasStockLimit={hasManagedStock(product)}
                isUnavailableForCart={isUnavailableForCart}
                showStockDetails={isAdmin}
                onDecrease={() => decreaseCartQuantity(product.id)}
                onIncrease={() => addToCart(product.id)}
                className="buy-box-stepper"
              />
            )}
          </aside>
        </div>

        {renderRelatedProducts(product)}

      </section>
    );
  };
  const renderWishlist = () => (
    <section className="page-view">
      <div className="page-title">
        <div>
          <p className="eyebrow">Saved for later</p>
          <h1>Wishlist</h1>
        </div>
        <div className="page-actions">
          {wishlistProducts.length > 0 && (
            <button type="button" onClick={moveWishlistToCart}>
              Move available to cart
            </button>
          )}
          <button type="button" onClick={openHome}>
            Back home
          </button>
        </div>
      </div>
      {wishlistProducts.length > 0 ? (
        <section className="products" aria-label="Wishlist products">
          {wishlistProducts.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <h2>Your wishlist is empty</h2>
          <p>Save a product from any product page or card.</p>
        </div>
      )}
    </section>
  );

  const renderCart = () => (
    <section className="page-view">
      <div className="page-title">
        <p className="eyebrow">Ready for checkout</p>
        <h1>Cart</h1>
        <button type="button" onClick={openHome}>
          Back home
        </button>
      </div>

      {cartProducts.length > 0 ? (
        <div className="cart-page">
          <section className="cart-list" aria-label="Cart products">
            {cartProducts.map((product) => {
              const stockQuantity = getStockQuantity(product);
              const hasStockLimit = hasManagedStock(product);
              const isOutOfStock = hasStockLimit && stockQuantity === 0;
              const isOverStock = hasStockLimit && product.quantity > stockQuantity;
              const isAtStockLimit = hasStockLimit && product.quantity >= stockQuantity;

              return (
                <article className="cart-item" key={product.id}>
                  <button className="image-button" type="button" onClick={() => openProduct(product.id)}>
                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(event) => applyFallbackImage(event, getFallbackImage(product.department))}
                    />
                  </button>
                  <div>
                    <h2>{product.name}</h2>
                    <p>{product.details}</p>
                    {hasStockLimit && (
                      <p className={`stock-status${isOutOfStock || isOverStock ? ' unavailable' : ''}`}>
                        {isOutOfStock
                          ? 'Unavailable'
                          : isOverStock
                            ? 'Requested quantity unavailable'
                            : getStockLabel(product)}
                      </p>
                    )}
                    <strong>{formatPrice(Number(product.price) * product.quantity)}</strong>
                    <p className="unit-price">{formatPrice(product.price)} each</p>
                    <div className="quantity-control" aria-label={`${product.name} quantity`}>
                      <button type="button" onClick={() => decreaseCartQuantity(product.id)}>
                        -
                      </button>
                      <span>Qty {product.quantity}</span>
                      <button type="button" onClick={() => addToCart(product.id)} disabled={isAtStockLimit}>
                        +
                      </button>
                    </div>
                    <div className="line-actions">
                      <button type="button" onClick={() => removeFromCart(product.id)}>
                        Remove
                      </button>
                      <button type="button" onClick={() => toggleWishlist(product.id)}>
                        Save for later
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="cart-summary" aria-label="Cart summary">
            <h2>Order summary</h2>
            <p className="cart-ready">{cartItemCount} items ready for checkout</p>
            {(cartMessage || cartStockIssue) && (
              <p className="stock-warning">
                {cartMessage ||
                  `${cartStockIssue.name} is unavailable in the requested quantity.`}
              </p>
            )}
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatPrice(cartTotal)}</strong>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <strong>Free</strong>
            </div>
            <button type="button" onClick={openPayment} disabled={Boolean(cartStockIssue)}>
              Proceed to payment
            </button>
            <p className="secure-note">UPI, card, net banking and cash on delivery available.</p>
          </aside>
        </div>
      ) : (
        <div className="empty-state">
          <h2>Your cart is empty</h2>
          <p>Add products from the home page or a product detail page.</p>
        </div>
      )}
    </section>
  );

  const renderPayment = () => {
    if (!currentUser || isAdmin) {
      return renderLogin();
    }

    const selectedPayment =
      paymentOptions.find((option) => option.id === selectedPaymentId) || paymentOptions[0];

    return (
      <section className="page-view">
        <div className="page-title">
          <p className="eyebrow">Secure checkout</p>
          <h1>Payment</h1>
          <button type="button" onClick={openCart}>
            Back to cart
          </button>
        </div>

        {cartProducts.length > 0 ? (
          <form className="checkout-page" onSubmit={placeOrder}>
            <section className="payment-panel" aria-label="Payment options">
              <h2>Choose payment method</h2>
              <div className="payment-options">
                {paymentOptions.map((option) => (
                  <label className="payment-option" key={option.id}>
                    <input
                      type="radio"
                      name="payment"
                      value={option.id}
                      checked={selectedPaymentId === option.id}
                      onChange={() => setSelectedPaymentId(option.id)}
                    />
                    <span>
                      <strong>{option.title}</strong>
                      <small>{option.detail}</small>
                    </span>
                  </label>
                ))}
              </div>

              <label className="payment-field">
                {selectedPayment.fieldLabel}
                <input
                  type="text"
                  placeholder={selectedPayment.placeholder}
                  disabled={selectedPayment.id === 'cod'}
                />
              </label>
              <p className="secure-note">
                This demo keeps payment details on the page only and does not process real payments.
              </p>
            </section>

            <aside className="cart-summary checkout-summary" aria-label="Payment summary">
              <h2>Pay {formatPrice(cartTotal)}</h2>
              <p className="cart-ready">{cartItemCount} items in this order</p>
              {cartStockIssue && (
                <p className="stock-warning">
                  {cartStockIssue.name} is unavailable in the requested quantity.
                </p>
              )}
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <strong>Free</strong>
              </div>
              <div className="summary-row">
                <span>Payment</span>
                <strong>{selectedPayment.title}</strong>
              </div>
              <button type="submit" disabled={Boolean(cartStockIssue)}>
                Place order
              </button>
              <p className="secure-note">Protected checkout with easy replacement support.</p>
            </aside>
          </form>
        ) : (
          <div className="empty-state">
            <h2>Your cart is empty</h2>
            <p>Add products before choosing a payment method.</p>
          </div>
        )}
      </section>
    );
  };

  const renderOrderConfirmation = () => (
    <section className="page-view">
      <div className="empty-state order-success">
        <span className="success-mark">OK</span>
        <h1>Order placed</h1>
        <p>
          {orderReceipt
            ? `${orderReceipt.itemCount} items paid by ${orderReceipt.paymentTitle}. Total ${formatPrice(
                orderReceipt.total
              )}.`
            : 'Your ProCart order has been placed.'}
        </p>
        {orderReceipt && <strong>Order ID: {orderReceipt.id}</strong>}
        {orderReceipt && <OrderTracker status={orderReceipt.status || 'Confirmed'} />}
        <button type="button" onClick={openHome}>
          Continue shopping
        </button>
      </div>
    </section>
  );

  const renderProfile = () => {
    if (!currentUser) {
      return renderLogin();
    }

    const orderCount = orderHistory.length;

    return (
      <section className="page-view profile-page">
        <div className="page-title">
          <div>
            <p className="eyebrow">Your account</p>
            <h1>Profile</h1>
          </div>
          <button type="button" onClick={openHome}>
            Back home
          </button>
        </div>

        <div className="profile-grid">
          <section className="profile-panel profile-hero" aria-label="Profile details">
            <div className="profile-avatar" aria-hidden="true">
              {currentUser.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <p className="eyebrow">Welcome back</p>
              <h2>{currentUser.name}</h2>
              <p>{currentUser.email}</p>
              <p>{profileDetails.phone}</p>
            </div>
            <button className="profile-hero-edit" type="button" onClick={startProfileEdit}>
              Edit profile
            </button>
            {authMessage && (
              <p className="form-message success" role="status">
                {authMessage}
              </p>
            )}
          </section>

          <section className="profile-panel profile-card-wide customer-command-center" aria-label="Customer dashboard">
            <div className="profile-panel-heading">
              <div>
                <p className="eyebrow">Customer hub</p>
                <h2>Shopping dashboard</h2>
              </div>
              <button type="button" onClick={() => openDepartment('all')}>
                Browse deals
              </button>
            </div>
            <div className="customer-action-grid">
              <button type="button" onClick={openCart}>
                <span>Cart</span>
                <strong>{cartItemCount} items</strong>
                <small>{cartTotal > 0 ? `${formatPrice(cartTotal)} ready for checkout` : 'No items waiting'}</small>
              </button>
              <button type="button" onClick={openWishlist}>
                <span>Wishlist</span>
                <strong>{wishlistProducts.length} saved</strong>
                <small>Keep track of products you like</small>
              </button>
              <button type="button" onClick={startProfileEdit}>
                <span>Delivery</span>
                <strong>{profileDetails.city}</strong>
                <small>{profileDetails.pincode} default address</small>
              </button>
              <button type="button" onClick={() => openDepartment('all')}>
                <span>Orders</span>
                <strong>{orderCount} placed</strong>
                <small>Track purchases and reorder quickly</small>
              </button>
            </div>
          </section>

          <section className="profile-panel" aria-label="Account information">
            <h2>Account information</h2>
            <dl className="profile-detail-list">
              <div className="profile-detail-row">
                <dt>Name</dt>
                <dd>{currentUser.name}</dd>
                <button type="button" onClick={startProfileEdit}>
                  Edit
                </button>
              </div>
              <div className="profile-detail-row">
                <dt>Email</dt>
                <dd>{currentUser.email}</dd>
                <button type="button" onClick={startProfileEdit}>
                  Edit
                </button>
              </div>
              <div className="profile-detail-row">
                <dt>Phone</dt>
                <dd>{profileDetails.phone}</dd>
                <button type="button" onClick={startProfileEdit}>
                  Edit
                </button>
              </div>
              <div className="profile-detail-row">
                <dt>Customer ID</dt>
                <dd>{currentUser.id}</dd>
                <span>Fixed</span>
              </div>
            </dl>
            <div className="profile-actions">
              <button type="button" onClick={openWishlist}>
                Wishlist
              </button>
              <button type="button" onClick={openCart}>
                Cart
              </button>
              <button className="secondary-action" type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </section>

          <form className="profile-panel profile-card-wide" onSubmit={saveProfileDetails}>
            <div className="profile-panel-heading">
              <div>
                <p className="eyebrow">Contact and delivery</p>
                <h2>Address book</h2>
              </div>
              {isProfileEditing ? (
                <div className="profile-edit-actions">
                  <button type="submit">Save changes</button>
                  <button type="button" onClick={cancelProfileEdit}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" onClick={startProfileEdit}>
                  Edit details
                </button>
              )}
            </div>
            <div className="profile-form">
              <label className="profile-field">
                <span>
                  Full name
                  <button type="button" onClick={startProfileEdit}>
                    Edit
                  </button>
                </span>
                <input
                  type="text"
                  name="name"
                  value={profileDetails.name}
                  disabled={!isProfileEditing}
                  onChange={handleProfileDetailChange}
                />
              </label>
              <label className="profile-field">
                <span>
                  Email address
                  <button type="button" onClick={startProfileEdit}>
                    Edit
                  </button>
                </span>
                <input
                  type="email"
                  name="email"
                  value={profileDetails.email}
                  disabled={!isProfileEditing}
                  onChange={handleProfileDetailChange}
                />
              </label>
              <label className="profile-field">
                <span>
                  Phone number
                  <button type="button" onClick={startProfileEdit}>
                    Edit
                  </button>
                </span>
                <input
                  type="tel"
                  name="phone"
                  value={profileDetails.phone}
                  disabled={!isProfileEditing}
                  onChange={handleProfileDetailChange}
                />
              </label>
              <label className="profile-field">
                <span>
                  Address line
                  <button type="button" onClick={startProfileEdit}>
                    Edit
                  </button>
                </span>
                <input
                  type="text"
                  name="addressLine"
                  value={profileDetails.addressLine}
                  disabled={!isProfileEditing}
                  onChange={handleProfileDetailChange}
                />
              </label>
              <label className="profile-field">
                <span>
                  Landmark
                  <button type="button" onClick={startProfileEdit}>
                    Edit
                  </button>
                </span>
                <input
                  type="text"
                  name="landmark"
                  value={profileDetails.landmark}
                  disabled={!isProfileEditing}
                  onChange={handleProfileDetailChange}
                />
              </label>
              <label className="profile-field">
                <span>
                  City
                  <button type="button" onClick={startProfileEdit}>
                    Edit
                  </button>
                </span>
                <input
                  type="text"
                  name="city"
                  value={profileDetails.city}
                  disabled={!isProfileEditing}
                  onChange={handleProfileDetailChange}
                />
              </label>
              <label className="profile-field">
                <span>
                  State
                  <button type="button" onClick={startProfileEdit}>
                    Edit
                  </button>
                </span>
                <input
                  type="text"
                  name="state"
                  value={profileDetails.state}
                  disabled={!isProfileEditing}
                  onChange={handleProfileDetailChange}
                />
              </label>
              <label className="profile-field">
                <span>
                  PIN code
                  <button type="button" onClick={startProfileEdit}>
                    Edit
                  </button>
                </span>
                <input
                  type="text"
                  name="pincode"
                  value={profileDetails.pincode}
                  disabled={!isProfileEditing}
                  onChange={handleProfileDetailChange}
                />
              </label>
            </div>
            <div className="address-preview">
              <span>Default delivery address</span>
              <strong>{currentUser.name}</strong>
              <p>{profileAddress}</p>
              <p>{profileDetails.phone}</p>
            </div>
          </form>

          <section className="profile-panel profile-card-wide" aria-label="Shopping summary">
            <h2>Shopping summary</h2>
            <div className="profile-stats">
              <button type="button" className="profile-stat" onClick={openCart}>
                <span>Cart items</span>
                <strong>{cartItemCount}</strong>
              </button>
              <button type="button" className="profile-stat" onClick={openWishlist}>
                <span>Wishlist</span>
                <strong>{wishlistProducts.length}</strong>
              </button>
              <button type="button" className="profile-stat" onClick={openCart}>
                <span>Cart total</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </button>
              <button type="button" className="profile-stat" onClick={() => openDepartment('all')}>
                <span>Orders</span>
                <strong>{orderCount}</strong>
              </button>
            </div>
          </section>

          <section className="profile-panel profile-card-wide order-history-panel" aria-label="Order history">
            <div className="profile-panel-heading">
              <div>
                <p className="eyebrow">Purchases</p>
                <h2>Order history</h2>
              </div>
              <button type="button" onClick={() => openDepartment('all')}>
                Browse deals
              </button>
            </div>
            {orderHistory.length > 0 ? (
              <div className="order-list">
                {orderHistory.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="order-card-top">
                      <div>
                        <span>Order placed</span>
                        <strong>
                          {new Date(order.placedAt || Date.now()).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </strong>
                      </div>
                      <div>
                        <span>Total</span>
                        <strong>{formatPrice(order.total)}</strong>
                      </div>
                      <div>
                        <span>Ship to</span>
                        <strong>{currentUser.name}</strong>
                      </div>
                      <div>
                        <span>Order ID</span>
                        <strong>{order.id}</strong>
                      </div>
                    </div>
                    <div className="order-status-row">
                      <span>{order.status || 'Confirmed'}</span>
                      <p>
                        {order.itemCount || (order.items || []).length} items paid by{' '}
                        {order.paymentTitle || paymentOptions[0].title}
                      </p>
                    </div>
                    <OrderTracker status={order.status || 'Confirmed'} />
                    <ul className="order-items">
                      {(order.items || []).map((item) => {
                        const quantity = item.quantity || 1;

                        return (
                          <li key={`${order.id}-${item.id}`}>
                            <span>
                              {item.name} {quantity > 1 ? `x ${quantity}` : ''}
                            </span>
                            <strong>{formatPrice(Number(item.price) * quantity)}</strong>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="order-address">
                      <span>Delivered to</span>
                      <p>{order.deliveryAddress || profileAddress}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-orders">
                <h3>No orders yet</h3>
                <p>Your placed orders will appear here with totals, payment method and delivery address.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    );
  };

  const renderAdmin = () => {
    if (!currentUser) {
      return renderAdminLogin();
    }

    if (!isAdmin) {
      return (
        <section className="page-view">
          <div className="empty-state">
            <h1>Admin access required</h1>
            <p>Sign in with an admin account to add products to ProCart.</p>
            <button type="button" onClick={openAdminLogin}>
              Go to admin login
            </button>
          </div>
        </section>
      );
    }

    const adminTabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'products', label: 'Products' },
      { id: 'inventory', label: 'Inventory' },
      { id: 'orders', label: 'Orders' },
      { id: 'users', label: 'Users' },
    ];
    const totalStock = allProducts.reduce(
      (total, product) => total + (Number(product.stockQuantity) || 0),
      0
    );
    const adminRevenue = adminOrders.reduce(
      (total, order) => total + (Number(order.total) || 0),
      0
    );
    const pendingOrders = adminOrders.filter(
      (order) => !['Delivered', 'Cancelled'].includes(order.status || 'Confirmed')
    );
    const lowStockProducts = allProducts.filter(
      (product) => (Number(product.stockQuantity) || 0) <= 5
    );
    const normalizedAdminSearch = adminSearchTerm.trim().toLowerCase();
    const inventoryProducts = allProducts.filter((product) => {
      const searchableText = [
        product.name,
        product.department,
        getDepartmentTitle(product.department),
        product.badge,
        product.details,
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !normalizedAdminSearch || searchableText.includes(normalizedAdminSearch);

      if (!matchesSearch) {
        return false;
      }

      if (adminInventoryFilter === 'low') {
        return getStockQuantity(product) <= 5;
      }

      if (adminInventoryFilter === 'unavailable') {
        return getStockQuantity(product) === 0;
      }

      if (adminInventoryFilter === 'admin-created') {
        return Boolean(product.adminCreated);
      }

      if (adminInventoryFilter === 'built-in') {
        return !product.adminCreated;
      }

      return true;
    });
    const topSellingProducts = Object.values(
      adminOrders
        .flatMap((order) => asArray(order.items))
        .reduce((summary, item) => {
          const quantity = Number(item.quantity) || 1;
          const current = summary[item.id] || {
            id: item.id,
            name: item.name,
            quantity: 0,
            revenue: 0,
          };

          summary[item.id] = {
            ...current,
            quantity: current.quantity + quantity,
            revenue: current.revenue + Number(item.price || 0) * quantity,
          };

          return summary;
        }, {})
    )
      .sort((first, second) => second.quantity - first.quantity)
      .slice(0, 4);
    const getAdminCustomer = (userId) =>
      adminUsers.find((user) => user.id === userId) || null;
    const formatAdminAddress = (user) =>
      [
        user?.address?.line1,
        user?.address?.landmark,
        user?.address?.city,
        user?.address?.state,
        user?.address?.pincode,
      ]
        .filter(Boolean)
        .join(', ');
    const getUserOrders = (userId) => adminOrders.filter((order) => order.userId === userId);
    const getUserSpend = (userId) =>
      getUserOrders(userId).reduce((total, order) => total + (Number(order.total) || 0), 0);
    const recentOrders = adminOrders.slice(0, 5);

    const renderAdminProducts = () => (
      <div className="admin-grid">
        <form className="admin-panel admin-form" onSubmit={addAdminProduct}>
          <div className="profile-panel-heading">
            <div>
              <p className="eyebrow">Catalog</p>
              <h2>{adminEditingProductId ? 'Edit product' : 'New product'}</h2>
            </div>
            <div className="admin-form-actions">
              {adminEditingProductId && (
                <button className="secondary-action" type="button" onClick={cancelAdminProductEdit}>
                  Cancel
                </button>
              )}
              <button type="submit" disabled={adminProductSaving}>
                {adminProductSaving
                  ? 'Saving...'
                  : adminEditingProductId
                    ? 'Save product'
                    : 'Add product'}
              </button>
            </div>
          </div>

          <div className="admin-form-grid">
            <label>
              Product name
              <input
                type="text"
                name="name"
                value={adminProductForm.name}
                onChange={handleAdminProductChange}
                placeholder="Example: UrbanRun Sneakers"
              />
            </label>
            <label>
              Department
              <select
                name="department"
                value={adminProductForm.department}
                onChange={handleAdminProductChange}
              >
                {departments.map((department) => (
                  <option value={department.id} key={department.id}>
                    {department.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price
              <input
                type="number"
                min="1"
                name="price"
                value={adminProductForm.price}
                onChange={handleAdminProductChange}
                placeholder="1999"
              />
            </label>
            <label>
              MRP
              <input
                type="number"
                min="1"
                name="mrp"
                value={adminProductForm.mrp}
                onChange={handleAdminProductChange}
                placeholder="2999"
              />
            </label>
            <label>
              Stock
              <input
                type="number"
                min="0"
                name="stockQuantity"
                value={adminProductForm.stockQuantity}
                onChange={handleAdminProductChange}
                placeholder="25"
              />
            </label>
            <label>
              Badge
              <input
                type="text"
                name="badge"
                value={adminProductForm.badge}
                onChange={handleAdminProductChange}
              />
            </label>
            <label className="admin-field-wide">
              Image URL
              <input
                type="url"
                name="image"
                value={adminProductForm.image}
                onChange={handleAdminProductChange}
                placeholder="https://..."
              />
            </label>
            <label className="admin-field-wide">
              Details
              <textarea
                name="details"
                value={adminProductForm.details}
                onChange={handleAdminProductChange}
                placeholder="Describe the product for shoppers"
                rows="4"
              />
            </label>
            <label>
              Specs
              <input
                type="text"
                name="specs"
                value={adminProductForm.specs}
                onChange={handleAdminProductChange}
                placeholder="Comma separated"
              />
            </label>
            <label>
              Keywords
              <input
                type="text"
                name="keywords"
                value={adminProductForm.keywords}
                onChange={handleAdminProductChange}
                placeholder="Comma separated"
              />
            </label>
          </div>
        </form>

        <aside className="admin-panel admin-products-panel">
          <h2>Admin products</h2>
          {adminProducts.length > 0 ? (
            <div className="admin-product-list">
              {adminProducts.map((product) => (
                <article className="admin-product-list-item" key={product.id}>
                  <button
                    className="admin-product-main"
                    type="button"
                    onClick={() => openProduct(product.id)}
                  >
                    <img
                      src={product.image}
                      alt=""
                      onError={(event) =>
                        applyFallbackImage(event, getFallbackImage(product.department))
                      }
                    />
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        {formatPrice(product.price)} - {getStockLabel(product) || `Stock ${product.stockQuantity ?? 0}`}
                      </small>
                    </span>
                  </button>
                  <div className="admin-row-actions">
                    <button type="button" onClick={() => editAdminProduct(product)}>
                      Edit
                    </button>
                    <button
                      className="danger-action"
                      type="button"
                      onClick={() => deleteAdminProduct(product.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="secure-note">Products added by admin will appear here.</p>
          )}
        </aside>
      </div>
    );

    const renderInventory = () => (
      <section className="admin-panel">
        <div className="profile-panel-heading">
          <div>
            <p className="eyebrow">Inventory</p>
            <h2>Catalog stock control</h2>
          </div>
          <button type="button" onClick={() => setAdminView('products')}>
            Add product
          </button>
        </div>
        <div className="admin-toolbar" aria-label="Inventory filters">
          <label>
            Search inventory
            <input
              type="search"
              value={adminSearchTerm}
              onChange={(event) => setAdminSearchTerm(event.target.value)}
              placeholder="Search product, department or badge"
            />
          </label>
          <label>
            Show
            <select
              value={adminInventoryFilter}
              onChange={(event) => setAdminInventoryFilter(event.target.value)}
            >
              {adminInventoryFilterOptions.map((option) => (
                <option value={option.id} key={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {(adminSearchTerm || adminInventoryFilter !== 'all') && (
            <button
              className="secondary-action"
              type="button"
              onClick={() => {
                setAdminSearchTerm('');
                setAdminInventoryFilter('all');
              }}
            >
              Clear
            </button>
          )}
        </div>
        {inventoryProducts.length > 0 ? (
          <div className="inventory-list">
            {inventoryProducts.map((product) => (
              <article className="inventory-row" key={product.id}>
                <img
                  src={product.image}
                  alt=""
                  onError={(event) => applyFallbackImage(event, getFallbackImage(product.department))}
                />
                <div>
                  <strong>{product.name}</strong>
                  <span>
                    {getDepartmentTitle(product.department)} -{' '}
                    {product.adminCreated ? 'Admin product' : 'Built-in product'}
                  </span>
                  <span className={`stock-status${getStockQuantity(product) === 0 ? ' unavailable' : ''}`}>
                    {getStockLabel(product)}
                  </span>
                </div>
                <div className="stock-stepper">
                  <button
                    type="button"
                    aria-label={`Decrease ${product.name} stock`}
                    disabled={getStockQuantity(product) === 0}
                    onClick={() =>
                      updateAdminProductStock(product.id, (Number(product.stockQuantity) || 0) - 1)
                    }
                  >
                    -
                  </button>
                  <span>{product.stockQuantity ?? 0}</span>
                  <button
                    type="button"
                    aria-label={`Increase ${product.name} stock`}
                    onClick={() =>
                      updateAdminProductStock(product.id, (Number(product.stockQuantity) || 0) + 1)
                    }
                  >
                    +
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="secure-note">No catalog products match this inventory view.</p>
        )}
      </section>
    );

    const renderAdminOrders = () => (
      <section className="admin-panel">
        <div className="profile-panel-heading">
          <div>
            <p className="eyebrow">Fulfillment</p>
            <h2>Customer orders</h2>
          </div>
          <button type="button" onClick={() => openDepartment('all')}>
            View store
          </button>
        </div>
        {adminOrders.length > 0 ? (
          <div className="admin-order-list">
            {adminOrders.map((order) => {
              const customer = getAdminCustomer(order.userId);
              const orderDate = new Date(order.placedAt || Date.now()).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              return (
                <article className="order-card admin-order-card" key={order.id}>
                  <div className="admin-order-head">
                    <div>
                      <span>Order</span>
                      <strong>{order.id}</strong>
                      <small>{orderDate}</small>
                    </div>
                    <label className="admin-status-select">
                      Status
                      <select
                        value={order.status || 'Confirmed'}
                        onChange={(event) => updateAdminOrderStatus(order.id, event.target.value)}
                      >
                        {orderStatusOptions.map((status) => (
                          <option value={status} key={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="admin-order-summary">
                    <div>
                      <span>Customer</span>
                      <strong>{customer?.name || order.userId}</strong>
                      <small>{customer?.email || 'Customer account'}</small>
                    </div>
                    <div>
                      <span>Phone</span>
                      <strong>{customer?.phone || 'Not available'}</strong>
                      <small>{customer?.role || 'CUSTOMER'}</small>
                    </div>
                    <div>
                      <span>Payment</span>
                      <strong>{order.paymentTitle || paymentOptions[0].title}</strong>
                      <small>{order.itemCount} items</small>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{formatPrice(order.total)}</strong>
                      <small>{order.status || 'Confirmed'}</small>
                    </div>
                  </div>

                  <OrderTracker status={order.status || 'Confirmed'} />

                  {asArray(order.items).length > 0 ? (
                    <ul className="order-items admin-order-items">
                      {asArray(order.items).map((item) => {
                        const quantity = item.quantity || 1;

                        return (
                          <li key={`${order.id}-${item.id}`}>
                            <span>
                              {item.name} {quantity > 1 ? `x ${quantity}` : ''}
                            </span>
                            <strong>{formatPrice(Number(item.price) * quantity)}</strong>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="secure-note">Item details will appear for newly placed orders.</p>
                  )}

                  <div className="order-address">
                    <span>Delivery address</span>
                    <p>{order.deliveryAddress || formatAdminAddress(customer) || 'Saved customer address'}</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="secure-note">Orders placed by customers will appear here.</p>
        )}
      </section>
    );

    const renderAdminUsers = () => (
      <section className="admin-panel">
        <div className="profile-panel-heading">
          <div>
            <p className="eyebrow">Accounts</p>
            <h2>Customer and admin users</h2>
          </div>
          <button type="button" onClick={() => setAdminView('orders')}>
            View orders
          </button>
        </div>
        {adminUsers.length > 0 ? (
          <div className="admin-user-grid">
            {adminUsers.map((user) => {
              const userOrders = getUserOrders(user.id);
              const userSpend = getUserSpend(user.id);
              const lastOrder = userOrders[0];

              return (
                <article className="admin-user-card" key={user.id}>
                  <div className="admin-user-top">
                    <span className="profile-avatar small-avatar" aria-hidden="true">
                      {user.name
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)}
                    </span>
                    <div>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </div>
                    <em>{user.role}</em>
                  </div>
                  <dl className="admin-user-details">
                    <div>
                      <dt>Phone</dt>
                      <dd>{user.phone || 'Not available'}</dd>
                    </div>
                    <div>
                      <dt>Orders</dt>
                      <dd>{userOrders.length}</dd>
                    </div>
                    <div>
                      <dt>Total spend</dt>
                      <dd>{formatPrice(userSpend)}</dd>
                    </div>
                    <div>
                      <dt>Last order</dt>
                      <dd>{lastOrder?.id || 'No orders yet'}</dd>
                    </div>
                  </dl>
                  <div className="order-address">
                    <span>Saved address</span>
                    <p>{formatAdminAddress(user) || 'No address saved'}</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="secure-note">Registered users will appear here.</p>
        )}
      </section>
    );

    const renderOverview = () => (
      <>
        <section className="admin-metrics">
          <button type="button" className="profile-stat" onClick={() => setAdminView('products')}>
            <span>Catalog items</span>
            <strong>{allProducts.length}</strong>
          </button>
          <button type="button" className="profile-stat" onClick={() => setAdminView('inventory')}>
            <span>Total stock</span>
            <strong>{totalStock}</strong>
          </button>
          <button type="button" className="profile-stat" onClick={() => setAdminView('inventory')}>
            <span>Low stock</span>
            <strong>{lowStockProducts.length}</strong>
          </button>
          <button type="button" className="profile-stat" onClick={() => setAdminView('orders')}>
            <span>Pending orders</span>
            <strong>{pendingOrders.length}</strong>
          </button>
          <button type="button" className="profile-stat" onClick={() => setAdminView('orders')}>
            <span>Revenue</span>
            <strong>{formatPrice(adminRevenue)}</strong>
          </button>
        </section>
        <div className="admin-grid">
          <section className="admin-panel">
            <div className="profile-panel-heading">
              <div>
                <p className="eyebrow">Action needed</p>
                <h2>Low stock</h2>
              </div>
              <button type="button" onClick={() => setAdminView('inventory')}>
                Manage
              </button>
            </div>
            {lowStockProducts.length > 0 ? (
              <div className="admin-product-list">
                {lowStockProducts.map((product) => (
                  <button type="button" onClick={() => setAdminView('inventory')} key={product.id}>
                    <img src={product.image} alt="" />
                    <span>
                      <strong>{product.name}</strong>
                      <small>{getStockQuantity(product) === 0 ? 'Unavailable' : `Only ${product.stockQuantity ?? 0} left`}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="secure-note">No low-stock admin products right now.</p>
            )}
          </section>
          <section className="admin-panel">
            <div className="profile-panel-heading">
              <div>
                <p className="eyebrow">Sales signal</p>
                <h2>Top selling</h2>
              </div>
              <button type="button" onClick={() => setAdminView('orders')}>
                Orders
              </button>
            </div>
            {topSellingProducts.length > 0 ? (
              <div className="admin-table compact">
                {topSellingProducts.map((product) => (
                  <article className="admin-table-row" key={product.id}>
                    <strong>{product.name}</strong>
                    <span>{product.quantity} sold</span>
                    <em>{formatPrice(product.revenue)}</em>
                  </article>
                ))}
              </div>
            ) : (
              <p className="secure-note">Top products will appear after customer orders.</p>
            )}
          </section>
          <section className="admin-panel">
            <div className="profile-panel-heading">
              <div>
                <p className="eyebrow">Latest activity</p>
                <h2>Recent orders</h2>
              </div>
              <button type="button" onClick={() => setAdminView('orders')}>
                Open queue
              </button>
            </div>
            {recentOrders.length > 0 ? (
              <div className="admin-table compact">
                {recentOrders.map((order) => {
                  const customer = getAdminCustomer(order.userId);

                  return (
                    <article className="admin-table-row" key={order.id}>
                      <strong>{order.id}</strong>
                      <span>{customer?.name || order.userId}</span>
                      <em>{order.status || 'Confirmed'}</em>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="secure-note">New customer orders will appear here.</p>
            )}
          </section>
          <section className="admin-panel">
            <div className="profile-panel-heading">
              <div>
                <p className="eyebrow">People</p>
                <h2>Store users</h2>
              </div>
              <button type="button" onClick={() => setAdminView('users')}>
                View users
              </button>
            </div>
            {adminUsers.length > 0 ? (
              <div className="admin-table compact">
                {adminUsers.slice(0, 4).map((user) => (
                  <article className="admin-table-row" key={user.id}>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <em>{user.role}</em>
                  </article>
                ))}
              </div>
            ) : (
              <p className="secure-note">Registered users will appear here.</p>
            )}
          </section>
        </div>
      </>
    );

    return (
      <section className="page-view admin-page">
        <div className="page-title">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Store manager</h1>
          </div>
          <button type="button" onClick={openHome}>
            Back home
          </button>
        </div>

        <section className="admin-hero-panel" aria-label="Admin summary">
          <div>
            <p className="eyebrow">Operations</p>
            <h2>Marketplace control room</h2>
            <p>
              {pendingOrders.length} orders need action, {lowStockProducts.length} low-stock items and{' '}
              {adminUsers.length} registered users.
            </p>
          </div>
          <div className="admin-hero-stats">
            <span>
              <strong>{allProducts.length}</strong>
              Catalog
            </span>
            <span>
              <strong>{pendingOrders.length}</strong>
              Pending
            </span>
            <span>
              <strong>{formatPrice(adminRevenue)}</strong>
              Revenue
            </span>
          </div>
        </section>

        <div className="admin-shell">
          <nav className="admin-tabs" aria-label="Admin sections">
            {adminTabs.map((tab) => (
              <button
                type="button"
                className={adminView === tab.id ? 'active' : ''}
                onClick={() => setAdminView(tab.id)}
                key={tab.id}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="admin-main-panel">
            {adminDataError && (
              <p className="form-message error" role="alert">
                {adminDataError}
              </p>
            )}
            {adminFormError && (
              <p className="form-message error" role="alert">
                {adminFormError}
              </p>
            )}
            {adminFormMessage && (
              <p className="form-message success" role="status">
                {adminFormMessage}
              </p>
            )}

            {adminView === 'products' && renderAdminProducts()}
            {adminView === 'inventory' && renderInventory()}
            {adminView === 'orders' && renderAdminOrders()}
            {adminView === 'users' && renderAdminUsers()}
            {adminView === 'overview' && renderOverview()}
          </div>
        </div>
      </section>
    );
  };

  const renderAdminLogin = () => {
    if (currentUser && isAdmin) {
      return renderAdmin();
    }

    if (currentUser) {
      return (
        <section className="login-page">
          <div className="login-card account-card">
            <div className="login-brand">
              <span className="brand-mark">pc</span>
              <strong>ProCart Admin</strong>
            </div>
            <h1>Admin Login</h1>
            <p className="demo-credentials">
              You are signed in as {currentUser.email}. Logout before using an admin account.
            </p>
            <button className="logout-button" type="button" onClick={handleLogout}>
              Logout
            </button>
            <button className="secondary-action" type="button" onClick={openHome}>
              Continue shopping
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="login-page">
        <form className="login-card" onSubmit={handleAdminLogin}>
          <div className="login-brand">
            <span className="brand-mark">pc</span>
            <strong>ProCart Admin</strong>
          </div>
          <h1>Admin Login</h1>
          <label>
            Admin email
            <input
              type="email"
              name="email"
              placeholder="Enter admin email"
              value={adminLoginForm.email}
              onChange={handleAdminLoginChange}
            />
          </label>
          <PasswordField
            id="admin-password"
            label="Admin password"
            placeholder="Enter admin password"
            value={adminLoginForm.password}
            onChange={handleAdminLoginChange}
          />
          <label className="check-row">
            <input
              type="checkbox"
              name="keepSignedIn"
              checked={adminLoginForm.keepSignedIn}
              onChange={handleAdminLoginChange}
            />
            Keep admin signed in
          </label>
          {authError && (
            <p className="form-message error" role="alert">
              {authError}
            </p>
          )}
          {authMessage && (
            <p className="form-message success" role="status">
              {authMessage}
            </p>
          )}
          <button type="submit" disabled={authStatus === 'loading'}>
            {authStatus === 'loading' ? 'Signing in' : 'Sign in as admin'}
          </button>
          <button className="secondary-action" type="button" onClick={openLogin}>
            Customer login
          </button>
        </form>
      </section>
    );
  };

  const renderLogin = () => (
    <section className="login-page">
      {currentUser ? (
        <div className="login-card account-card">
          <div className="login-brand">
            <span className="brand-mark">pc</span>
            <strong>ProCart</strong>
          </div>
          <h1>Account</h1>
          <div className="account-summary">
            <span>Signed in as</span>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.email}</small>
          </div>
          {authMessage && (
            <p className="form-message success" role="status">
              {authMessage}
            </p>
          )}
          <button className="logout-button" type="button" onClick={handleLogout}>
            Logout
          </button>
          <button className="secondary-action" type="button" onClick={openHome}>
            Continue shopping
          </button>
        </div>
      ) : (
        <form
          className={`login-card ${authMode === 'signup' ? 'signup-card' : ''}`}
          onSubmit={authMode === 'signup' ? handleRegister : handleLogin}
        >
          <div className="login-brand">
            <span className="brand-mark">pc</span>
            <strong>{authMode === 'signup' ? 'New shopper' : 'ProCart'}</strong>
          </div>
          <h1>{authMode === 'signup' ? 'Create account' : 'Login'}</h1>
          {authMode === 'login' ? (
            <>
              <label>
                Email or mobile number
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                />
              </label>
              <PasswordField
                id="customer-password"
                label="Password"
                placeholder="Enter password"
                value={loginForm.password}
                onChange={handleLoginChange}
              />
              <label className="check-row">
                <input
                  type="checkbox"
                  name="keepSignedIn"
                  checked={loginForm.keepSignedIn}
                  onChange={handleLoginChange}
                />
                Keep me signed in
              </label>
            </>
          ) : (
            <>
              <label>
                Full name
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={registerForm.name}
                  onChange={handleRegisterChange}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={registerForm.email}
                  onChange={handleRegisterChange}
                />
              </label>
              <PasswordField
                id="register-password"
                label="Password"
                placeholder="Create password"
                value={registerForm.password}
                onChange={handleRegisterChange}
              />
              <label>
                Mobile number
                <input
                  type="tel"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={registerForm.phone}
                  onChange={handleRegisterChange}
                />
              </label>
            </>
          )}
          {authError && (
            <p className="form-message error" role="alert">
              {authError}
            </p>
          )}
          {authMessage && (
            <p className="form-message success" role="status">
              {authMessage}
            </p>
          )}
          <button type="submit" disabled={authStatus === 'loading'}>
            {authStatus === 'loading'
              ? authMode === 'signup'
                ? 'Creating account'
                : 'Signing in'
              : authMode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
          {authMode === 'login' ? (
            <div className="auth-switch">
              <span>Don't have an account?</span>
              <button
                className="secondary-action"
                type="button"
                onClick={() => {
                  setAuthError('');
                  setAuthMessage('');
                  setAuthMode('signup');
                }}
              >
                Create account
              </button>
            </div>
          ) : (
            <div className="auth-switch">
              <span>Already have an account?</span>
              <button
                className="secondary-action"
                type="button"
                onClick={() => {
                  setAuthError('');
                  setAuthMessage('');
                  setAuthMode('login');
                }}
              >
                Sign in
              </button>
            </div>
          )}
          {authMode === 'login' && (
            <>
              <button className="secondary-action" type="button" onClick={openHome}>
                Continue shopping
              </button>
              <button className="secondary-action" type="button" onClick={openAdminLogin}>
                Admin login
              </button>
            </>
          )}
        </form>
      )}
    </section>
  );

  const renderPage = () => {
    if (view.page === 'product') {
      return renderProductPage();
    }

    if (view.page === 'department') {
      return renderDepartment();
    }

    if (view.page === 'search') {
      return renderSearch();
    }

    if (view.page === 'wishlist') {
      return renderWishlist();
    }

    if (view.page === 'cart') {
      return <CartPage>{renderCart()}</CartPage>;
    }

    if (view.page === 'payment') {
      return <CheckoutPage>{renderPayment()}</CheckoutPage>;
    }

    if (view.page === 'order-confirmation') {
      return renderOrderConfirmation();
    }

    if (view.page === 'login') {
      return <LoginPage>{renderLogin()}</LoginPage>;
    }

    if (view.page === 'profile') {
      return <ProfilePage>{renderProfile()}</ProfilePage>;
    }

    if (view.page === 'admin') {
      return <AdminPage>{renderAdmin()}</AdminPage>;
    }

    if (view.page === 'admin-login') {
      return <LoginPage>{renderAdminLogin()}</LoginPage>;
    }

    return <HomePage>{renderHome()}</HomePage>;
  };

  return (
    <AuthProvider
      value={{ authStatus, authToken, currentUser, isAdmin, login: handleLogin, logout: handleLogout }}
    >
      <CartProvider
        value={{ cartItemCount, cartItems, addToCart, decreaseCartQuantity, removeFromCart }}
      >
        <div className="app">
      <Header
        authStatus={authStatus}
        cartItemCount={cartItemCount}
        currentUser={currentUser}
        firstName={firstName}
        isAdmin={isAdmin}
        navItems={navItems}
        onAdmin={openAdmin}
        onAdminLogin={openAdminLogin}
        onCart={openCart}
        onDepartment={openDepartment}
        onHome={openHome}
        onLogin={openLogin}
        onLogout={handleLogout}
        onProfile={openProfile}
        onSearch={handleSearch}
        onSearchTermChange={setSearchTerm}
        onWishlist={openWishlist}
        searchOptions={searchOptions}
        searchTerm={searchTerm}
        wishlistCount={wishlistProducts.length}
      />

      <main>{renderPage()}</main>
          <Footer
            isSignedIn={Boolean(currentUser)}
            onBackToTop={scrollToTop}
            onHome={openHome}
            onNavigate={handleFooterNavigate}
          />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
