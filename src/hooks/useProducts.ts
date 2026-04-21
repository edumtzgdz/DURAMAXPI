import { useState, useEffect } from 'react';
import type { Product } from '../types';

const STORAGE_KEY = 'edd_products';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProducts(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse products from local storage:', e);
      }
    }
  }, []);

  // Save to local storage whenever products update
  const addProduct = (product: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    
    setProducts((prev) => {
      const updated = [newProduct, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return {
    products,
    addProduct,
    updateProduct,
    deleteProduct
  };
}
