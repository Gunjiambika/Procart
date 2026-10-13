import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

const originalFetch = global.fetch;
const demoUser = {
  id: 'demo',
  name: 'Demo Shopper',
  email: 'demo@procart.com',
  role: 'CUSTOMER',
  phone: '+91 98765 43210',
  address: {
    line1: '221B Market Street',
    landmark: 'Near ProCart pickup point',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
  },
};
const adminUser = {
  id: 'admin',
  name: 'Admin Manager',
  email: 'admin@procart.com',
  role: 'ADMIN',
  phone: '+91 90000 11111',
  address: {
    line1: 'ProCart Operations Desk',
    landmark: 'Admin floor',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
  },
};

const jsonResponse = (payload, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    json: async () => payload,
  });

const mockApi = ({
  loginUser = demoUser,
  registeredUser = null,
  addedProduct = null,
  adminProducts = [],
  orderError = null,
  orders = [],
  users = [adminUser, demoUser],
} = {}) => {
  let savedCartItems = [];
  let savedAdminProducts = [...adminProducts];

  global.fetch = jest.fn((url, options = {}) => {
    const requestUrl = typeof url === 'string' ? url : url?.url || '';

    if (requestUrl.includes('/api/products/admin-created')) {
      return jsonResponse(savedAdminProducts);
    }

    if (requestUrl.includes('/api/auth/login')) {
      return jsonResponse({
        token: loginUser.role === 'ADMIN' ? 'admin-token' : 'session-token',
        user: loginUser,
      });
    }

    if (requestUrl.includes('/api/auth/register')) {
      const body = JSON.parse(options.body);
      return jsonResponse({
        token: 'registered-token',
        user: registeredUser || {
          ...demoUser,
          id: 'customer-new',
          name: body.name,
          email: body.email,
          phone: body.phone,
        },
      });
    }

    if (requestUrl.includes('/api/auth/me')) {
      return jsonResponse(loginUser);
    }

    if (requestUrl.includes('/api/auth/logout')) {
      return jsonResponse({ message: 'Signed out.' });
    }

    if (requestUrl.includes('/api/admin/users')) {
      return jsonResponse(users);
    }

    if (requestUrl.includes('/api/admin/orders') && options.method === 'PATCH') {
      const body = JSON.parse(options.body);
      const orderId = requestUrl.split('/').slice(-2)[0];
      const order = orders.find((item) => item.id === orderId) || orders[0];
      return jsonResponse({ ...order, id: orderId, status: body.status });
    }

    if (requestUrl.includes('/api/admin/orders')) {
      return jsonResponse(orders);
    }

    if (
      requestUrl.includes('/api/admin/products') &&
      (options.method === 'POST' || options.method === 'PUT')
    ) {
      const product = addedProduct || JSON.parse(options.body);
      savedAdminProducts =
        options.method === 'PUT'
          ? savedAdminProducts.map((item) => (item.id === product.id ? product : item))
          : [product, ...savedAdminProducts.filter((item) => item.id !== product.id)];
      return jsonResponse(product);
    }

    if (requestUrl.includes('/api/admin/products') && options.method === 'PATCH') {
      const [, productId, stockQuantity] =
        requestUrl.match(/\/api\/admin\/products\/([^/]+)\/stock\/(\d+)/) || [];
      const product = savedAdminProducts.find((item) => item.id === productId);
      const updatedProduct = {
        ...(product || { id: productId }),
        stockQuantity: Number(stockQuantity),
      };
      savedAdminProducts = savedAdminProducts.map((item) =>
        item.id === productId ? updatedProduct : item
      );
      return jsonResponse(updatedProduct);
    }

    if (requestUrl.includes('/api/admin/products') && options.method === 'DELETE') {
      const productId = requestUrl.split('/api/admin/products/')[1];
      savedAdminProducts = savedAdminProducts.filter((item) => item.id !== productId);
      return jsonResponse(null);
    }

    if (requestUrl.includes('/api/admin/products')) {
      return jsonResponse(savedAdminProducts);
    }

    if (requestUrl.includes('/api/cart/items') && options.method === 'POST') {
      const body = JSON.parse(options.body);
      const currentItem = savedCartItems.find((item) => item.productId === body.productId);

      if (currentItem) {
        savedCartItems = savedCartItems.map((item) =>
          item.productId === body.productId
            ? { ...item, quantity: item.quantity + (body.quantity || 1) }
            : item
        );
      } else {
        savedCartItems = [...savedCartItems, { ...body, quantity: body.quantity || 1 }];
      }

      return jsonResponse(savedCartItems);
    }

    if (requestUrl.includes('/api/cart/items') && options.method === 'PATCH') {
      const [productId, quantityValue] = requestUrl.split('/api/cart/items/')[1].split('/');
      const quantity = Number(quantityValue);
      savedCartItems =
        quantity > 0
          ? savedCartItems.map((item) =>
              item.productId === productId ? { ...item, quantity } : item
            )
          : savedCartItems.filter((item) => item.productId !== productId);

      return jsonResponse(savedCartItems);
    }

    if (requestUrl.includes('/api/cart/items') && options.method === 'DELETE') {
      const productId = requestUrl.split('/api/cart/items/')[1];
      savedCartItems = savedCartItems.filter((item) => item.productId !== productId);
      return jsonResponse(savedCartItems);
    }

    if (requestUrl.includes('/api/cart')) {
      return jsonResponse(savedCartItems);
    }

    if (requestUrl.includes('/api/orders') && options.method === 'POST') {
      if (orderError) {
        return jsonResponse({ message: orderError }, false);
      }

      return jsonResponse(JSON.parse(options.body));
    }

    if (requestUrl.includes('/api/orders')) {
      return jsonResponse(orders);
    }

    return jsonResponse({});
  });
};

beforeEach(() => {
  window.localStorage.clear();
  mockApi();
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('renders procart storefront', () => {
  render(<App />);
  expect(screen.getAllByRole('button', { name: /procart home/i })[0]).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /shop the deals/i })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /trending now/i })).toBeInTheDocument();

  const mainNav = screen.getByRole('navigation', { name: /main navigation/i });
  ['Today\'s Deals', 'Men', 'Women', 'Shoes', 'Kids', 'Beauty', 'Accessories'].forEach((item) => {
    expect(within(mainNav).getByRole('button', { name: item })).toBeInTheDocument();
  });
  expect(screen.queryByRole('combobox', { name: /search category/i })).not.toBeInTheDocument();
});

test('opens product, wishlist, cart, and login pages', () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: /nova 5g mobile phone/i })[0]);
  expect(screen.getByRole('heading', { name: /nova 5g mobile phone/i })).toBeInTheDocument();

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });

  fireEvent.click(within(accountNav).getByRole('button', { name: /wishlist/i }));
  expect(screen.getByRole('heading', { name: /^wishlist$/i })).toBeInTheDocument();

  fireEvent.click(within(accountNav).getByRole('button', { name: /cart/i }));
  expect(screen.getByRole('heading', { name: /^cart$/i })).toBeInTheDocument();

  fireEvent.click(within(accountNav).getByRole('button', { name: /^login$/i }));
  expect(screen.getByRole('heading', { name: /^login$/i })).toBeInTheDocument();
});

test('keeps login credentials private and toggles password visibility', () => {
  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /^login$/i }));

  const emailInput = screen.getByLabelText(/email or mobile number/i);
  const passwordInput = screen.getByLabelText(/^password$/i);
  expect(emailInput).toHaveValue('');
  expect(passwordInput).toHaveValue('');
  expect(passwordInput).toHaveAttribute('type', 'password');
  expect(screen.queryByText(/demo@procart\.com|procart123/i)).not.toBeInTheDocument();

  fireEvent.change(passwordInput, { target: { value: 'private-password' } });
  fireEvent.click(screen.getByRole('button', { name: /show password/i }));
  expect(passwordInput).toHaveAttribute('type', 'text');

  fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
  expect(passwordInput).toHaveAttribute('type', 'password');
});

test('filters catalog products by price', () => {
  render(<App />);

  const mainNav = screen.getByRole('navigation', { name: /main navigation/i });
  fireEvent.click(within(mainNav).getByRole('button', { name: /today's deals/i }));

  expect(screen.getByRole('region', { name: /product filters/i })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^price$/i), {
    target: { value: 'under-1000' },
  });

  expect(
    screen
      .getAllByRole('button', { name: /clearcall wired earphones/i })
      .some((button) => button.classList.contains('title-button'))
  ).toBe(true);
  expect(
    screen
      .queryAllByRole('button', { name: /nova 5g mobile phone/i })
      .some((button) => button.classList.contains('title-button'))
  ).toBe(false);
});

test('availability filter follows cart stock limits', () => {
  render(<App />);

  const mainNav = screen.getByRole('navigation', { name: /main navigation/i });
  fireEvent.click(within(mainNav).getByRole('button', { name: /today's deals/i }));

  for (let index = 0; index < 9; index += 1) {
    fireEvent.click(screen.getByRole('button', { name: /increase nova 5g mobile phone/i }));
  }

  fireEvent.change(screen.getByLabelText(/^availability$/i), {
    target: { value: 'available' },
  });
  expect(
    screen
      .queryAllByRole('button', { name: /nova 5g mobile phone/i })
      .some((button) => button.classList.contains('title-button'))
  ).toBe(false);

  fireEvent.change(screen.getByLabelText(/^availability$/i), {
    target: { value: 'unavailable' },
  });
  expect(
    screen
      .getAllByRole('button', { name: /nova 5g mobile phone/i })
      .some((button) => button.classList.contains('title-button'))
  ).toBe(true);
});

test('moves available wishlist products to cart', async () => {
  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /wishlist/i }));
  fireEvent.click(screen.getByRole('button', { name: /move available to cart/i }));

  expect(await within(accountNav).findByRole('button', { name: /cart 5/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /your wishlist is empty/i })).toBeInTheDocument();
});

test('requires login before payment', () => {
  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /cart/i }));
  fireEvent.click(screen.getByRole('button', { name: /proceed to payment/i }));

  expect(screen.getByRole('heading', { name: /^login$/i })).toBeInTheDocument();
  expect(screen.getByText(/please login before payment/i)).toBeInTheDocument();
});

test('adds the same product multiple times with quantity controls', () => {
  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  const productTitle = screen
    .getAllByRole('button', { name: /pocketbass wireless earbuds/i })
    .find((button) => button.classList.contains('title-button'));
  let productCard = productTitle.closest('article');

  fireEvent.click(within(productCard).getByRole('button', { name: /increase pocketbass wireless earbuds/i }));
  expect(within(accountNav).getByRole('button', { name: /cart 4/i })).toBeInTheDocument();

  productCard = screen
    .getAllByRole('button', { name: /pocketbass wireless earbuds/i })
    .find((button) => button.classList.contains('title-button'))
    .closest('article');
  fireEvent.click(within(productCard).getByRole('button', { name: /increase pocketbass wireless earbuds/i }));

  expect(within(accountNav).getByRole('button', { name: /cart 5/i })).toBeInTheDocument();

  fireEvent.click(within(accountNav).getByRole('button', { name: /cart 5/i }));

  const cartItem = screen.getByRole('heading', { name: /pocketbass wireless earbuds/i }).closest('article');
  expect(within(cartItem).getByText(/qty 2/i)).toBeInTheDocument();
});

test('shows unavailable with a decrease option after all stock is in cart', () => {
  render(<App />);

  const findEarbudsCard = () =>
    screen
      .getAllByRole('button', { name: /pocketbass wireless earbuds/i })
      .find((button) => button.classList.contains('title-button'))
      .closest('article');

  let productCard = findEarbudsCard();

  for (let count = 0; count < 10; count += 1) {
    fireEvent.click(within(productCard).getByRole('button', { name: /increase pocketbass wireless earbuds/i }));
    productCard = findEarbudsCard();
  }

  expect(productCard).toHaveClass('stock-unavailable-card');
  expect(
    within(productCard).getByRole('button', { name: /pocketbass wireless earbuds unavailable/i })
  ).toBeDisabled();
  expect(within(productCard).getAllByText(/^unavailable$/i).length).toBeGreaterThan(0);

  fireEvent.click(within(productCard).getByRole('button', { name: /decrease pocketbass wireless earbuds/i }));

  productCard = findEarbudsCard();
  expect(productCard).not.toHaveClass('stock-unavailable-card');
  expect(within(productCard).getByRole('button', { name: /increase pocketbass wireless earbuds/i })).toBeEnabled();
  expect(within(productCard).getByText(/qty 9/i)).toBeInTheDocument();
  expect(within(productCard).queryByText(/9 \/ 10/i)).not.toBeInTheDocument();
});

test('checks out with a selected payment option after login', async () => {
  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /cart/i }));
  fireEvent.click(screen.getByRole('button', { name: /proceed to payment/i }));
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByRole('heading', { name: /^payment$/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: /cash on delivery/i }));
  fireEvent.click(screen.getByRole('button', { name: /place order/i }));

  expect(await screen.findByRole('heading', { name: /order placed/i })).toBeInTheDocument();
  expect(screen.getByText(/paid by cash on delivery/i)).toBeInTheDocument();
});

test('shows backend stock errors instead of placing a local order', async () => {
  mockApi({ orderError: 'Nova 5G Mobile Phone has only 0 left.' });

  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /cart/i }));
  fireEvent.click(screen.getByRole('button', { name: /proceed to payment/i }));
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByRole('heading', { name: /^payment$/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /place order/i }));

  expect(await screen.findByRole('heading', { name: /^cart$/i })).toBeInTheDocument();
  expect(screen.getByText(/one or more products are unavailable in the requested quantity/i)).toBeInTheDocument();
  expect(screen.queryByText(/nova 5g mobile phone has only 0 left/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /order placed/i })).not.toBeInTheDocument();
});

test('signs in and signs out with the backend session', async () => {
  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /^login$/i }));
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByRole('heading', { name: /^profile$/i })).toBeInTheDocument();
  expect(await screen.findByText(/welcome back, demo shopper/i)).toBeInTheDocument();
  expect(screen.getAllByText(/\+91 98765 43210/i)[0]).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /address book/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /order history/i })).toBeInTheDocument();
  expect(within(accountNav).getByRole('button', { name: /hi, demo/i })).toBeInTheDocument();

  fireEvent.click(within(accountNav).getByRole('button', { name: /logout/i }));

  expect(await within(accountNav).findByRole('button', { name: /^login$/i })).toBeInTheDocument();
  expect(within(accountNav).getByRole('button', { name: /cart 0/i })).toBeInTheDocument();
});

test('creates a customer account with the backend register endpoint', async () => {
  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /^login$/i }));
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  const signupForm = screen.getByRole('heading', { name: /create account/i }).closest('form');
  fireEvent.change(within(signupForm).getByLabelText(/full name/i), {
    target: { value: 'New Shopper' },
  });
  fireEvent.change(within(signupForm).getByLabelText(/^email$/i), {
    target: { value: 'new@procart.com' },
  });
  fireEvent.change(within(signupForm).getByLabelText(/^password$/i), {
    target: { value: 'newpass123' },
  });
  fireEvent.change(within(signupForm).getByLabelText(/mobile number/i), {
    target: { value: '+91 90000 22222' },
  });
  fireEvent.click(within(signupForm).getByRole('button', { name: /create account/i }));

  expect(await screen.findByRole('heading', { name: /^profile$/i })).toBeInTheDocument();
  expect(screen.getByText(/account created. welcome, new shopper/i)).toBeInTheDocument();
  expect(within(accountNav).getByRole('button', { name: /hi, new/i })).toBeInTheDocument();
});

test('adds placed orders to the profile order history', async () => {
  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /^login$/i }));
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByRole('heading', { name: /^profile$/i })).toBeInTheDocument();

  fireEvent.click(within(accountNav).getByRole('button', { name: /cart/i }));
  fireEvent.click(screen.getByRole('button', { name: /proceed to payment/i }));
  fireEvent.click(screen.getByRole('button', { name: /place order/i }));
  expect(await screen.findByRole('heading', { name: /order placed/i })).toBeInTheDocument();
  fireEvent.click(within(accountNav).getByRole('button', { name: /hi, demo/i }));

  expect(screen.getByRole('heading', { name: /order history/i })).toBeInTheDocument();
  expect(screen.getAllByText(/confirmed/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/noiseshield wireless headphones/i)).toBeInTheDocument();
});

test('admin can add a product through the admin form', async () => {
  const addedProduct = {
    id: 'admin-urbanrun-sneakers',
    name: 'UrbanRun Sneakers',
    department: 'shoes',
    image: 'https://example.com/shoe.jpg',
    gallery: ['https://example.com/shoe.jpg'],
    price: 1999,
    mrp: 2999,
    rating: 'New',
    reviews: '0',
    badge: 'Admin pick',
    details: 'Light sneakers for everyday comfort.',
    specs: ['Lightweight', 'Cushioned sole'],
    keywords: ['sneakers', 'shoes'],
    stockQuantity: 15,
    adminCreated: true,
  };

  mockApi({ loginUser: adminUser, addedProduct });

  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /^admin login$/i }));
  fireEvent.change(screen.getByLabelText(/admin email/i), {
    target: { value: 'admin@procart.com' },
  });
  fireEvent.change(screen.getByLabelText(/^admin password$/i), {
    target: { value: 'admin123' },
  });
  fireEvent.click(screen.getByRole('button', { name: /sign in as admin/i }));

  expect(await within(accountNav).findByRole('button', { name: /^admin$/i })).toBeInTheDocument();
  fireEvent.click(within(accountNav).getByRole('button', { name: /^admin$/i }));
  expect(await screen.findByRole('heading', { name: /store manager/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^products$/i }));

  fireEvent.change(screen.getByLabelText(/product name/i), {
    target: { value: 'UrbanRun Sneakers' },
  });
  fireEvent.change(screen.getByLabelText(/^department$/i), {
    target: { value: 'shoes' },
  });
  fireEvent.change(screen.getByLabelText(/^price$/i), {
    target: { value: '1999' },
  });
  fireEvent.change(screen.getByLabelText(/^mrp$/i), {
    target: { value: '2999' },
  });
  fireEvent.change(screen.getByLabelText(/details/i), {
    target: { value: 'Light sneakers for everyday comfort.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add product/i }));

  expect(await screen.findByText(/urbanrun sneakers was added/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /urbanrun sneakers/i })).toBeInTheDocument();
});

test('zero-stock admin products are unavailable until admin restocks them', async () => {
  const adminProduct = {
    id: 'admin-restock-charger',
    name: 'Restock Charger',
    department: 'accessories',
    image: 'https://example.com/charger.jpg',
    gallery: ['https://example.com/charger.jpg'],
    price: 999,
    mrp: 1499,
    rating: 'New',
    reviews: '0',
    badge: 'Admin pick',
    details: 'Compact charger with fast charging support.',
    specs: ['Fast charging', 'Compact body'],
    keywords: ['charger', 'accessories'],
    stockQuantity: 0,
    adminCreated: true,
  };

  mockApi({ loginUser: adminUser, adminProducts: [adminProduct] });

  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /^admin login$/i }));
  fireEvent.click(screen.getByRole('button', { name: /sign in as admin/i }));

  expect(await within(accountNav).findByRole('button', { name: /^admin$/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^inventory$/i }));

  expect(
    await screen.findByRole('button', { name: /decrease restock charger stock/i })
  ).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /increase restock charger stock/i }));

  expect(await screen.findByText(/restock charger stock updated/i)).toBeInTheDocument();
  expect(screen.getAllByText(/only 1 left/i)[0]).toBeInTheDocument();
});

test('admin can search and update built-in product stock', async () => {
  mockApi({ loginUser: adminUser });

  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /^admin login$/i }));
  fireEvent.click(screen.getByRole('button', { name: /sign in as admin/i }));

  expect(await within(accountNav).findByRole('button', { name: /^admin$/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^inventory$/i }));
  fireEvent.change(screen.getByLabelText(/search inventory/i), {
    target: { value: 'Nova' },
  });
  fireEvent.click(screen.getByRole('button', { name: /decrease nova 5g mobile phone stock/i }));

  expect(await screen.findByText(/nova 5g mobile phone stock updated/i)).toBeInTheDocument();
  expect(screen.getByText(/9 in stock/i)).toBeInTheDocument();
});

test('admin can update an order status', async () => {
  const orders = [
    {
      id: 'PC123456',
      userId: 'demo',
      itemCount: 2,
      total: 4998,
      paymentTitle: 'UPI',
      placedAt: '2026-06-08T09:30:00.000Z',
      status: 'Confirmed',
      deliveryAddress: 'Bengaluru',
      items: [],
    },
  ];

  mockApi({ loginUser: adminUser, orders });

  render(<App />);

  const accountNav = screen.getByRole('navigation', { name: /account navigation/i });
  fireEvent.click(within(accountNav).getByRole('button', { name: /^admin login$/i }));
  fireEvent.click(screen.getByRole('button', { name: /sign in as admin/i }));

  expect(await within(accountNav).findByRole('button', { name: /^admin$/i })).toBeInTheDocument();
  fireEvent.click(within(accountNav).getByRole('button', { name: /^admin$/i }));
  const adminTabs = await screen.findByRole('navigation', { name: /admin sections/i });
  fireEvent.click(within(adminTabs).getByRole('button', { name: /^orders$/i }));

  fireEvent.change(screen.getByLabelText(/status/i), {
    target: { value: 'Shipped' },
  });

  expect(await screen.findByText(/order pc123456 moved to shipped/i)).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: /status/i })).toHaveValue('Shipped');
});
