import { createContext, useContext, useState, ReactNode } from 'react';

export interface CartAdicional {
  id: string;
  nome: string;
  preco: number;
}

export interface CartItem {
  id: string; // id unico do item no carrinho (gerado)
  produto_id: string;
  nome: string;
  preco_unitario: number;
  quantidade: number;
  adicionais: CartAdicional[];
  observacao: string;
  imagem: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantidade: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
});

export function useCart() {
  return useContext(CartContext);
}

function calcItemTotal(item: CartItem): number {
  const adicionaisTotal = item.adicionais.reduce((sum, a) => sum + a.preco, 0);
  return (item.preco_unitario + adicionaisTotal) * item.quantidade;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  function addItem(item: Omit<CartItem, 'id'>) {
    const newItem: CartItem = {
      ...item,
      id: crypto.randomUUID(),
    };
    setItems((prev) => [...prev, newItem]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateQuantity(id: string, quantidade: number) {
    if (quantidade <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantidade } : i))
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantidade, 0);
  const totalPrice = items.reduce((sum, i) => sum + calcItemTotal(i), 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}
