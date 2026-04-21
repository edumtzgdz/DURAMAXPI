import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { apiFetch } from '../utils/apiClient';

const STORAGE_KEY = 'products';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load from R2 on mount
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/storage?key=${STORAGE_KEY}`);
        const data = await response.json() as Product[];
        setProducts(Array.isArray(data) ? data : []);
      } catch (e: any) {
        console.error('Failed to load products from R2:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const saveToR2 = async (updated: Product[]) => {
    try {
      await apiFetch(`/api/storage?key=${STORAGE_KEY}`, {
        method: 'POST',
        body: JSON.stringify(updated),
      });
    } catch (e: any) {
      console.error('Failed to save to R2:', e);
      alert('Error al guardar en la nube: ' + e.message);
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    
    const updated = [newProduct, ...products];
    setProducts(updated);
    await saveToR2(updated);
  };

  const deleteProduct = async (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    await saveToR2(updated);
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const updated = products.map(p => p.id === id ? { ...p, ...updates } : p);
    setProducts(updated);
    await saveToR2(updated);
  };

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct
  };
}
