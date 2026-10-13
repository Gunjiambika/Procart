import { createContext, useContext } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children, value }) {
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside CartProvider.');
  }

  return context;
}
