import { useState, useEffect } from 'react';
import type { Material, MaterialCategory } from '../types';
import { apiFetch } from '../utils/apiClient';

const MATERIALS_KEY = 'materials';
const CATEGORIES_KEY = 'material_categories';

export const DEFAULT_CATEGORIES = [
  { id: 'cat-piel', name: 'PIEL' },
  { id: 'cat-forro', name: 'FORRO' },
  { id: 'cat-sintetico', name: 'SINTÉTICO' },
  { id: 'cat-textil', name: 'TEXTIL' },
  { id: 'cat-herraje', name: 'HERRAJE' },
  { id: 'cat-adorn', name: 'ADORNO' },
  { id: 'cat-otro', name: 'OTRO' }
];

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [mRes, cRes] = await Promise.all([
          apiFetch(`/api/storage?key=${MATERIALS_KEY}`),
          apiFetch(`/api/storage?key=${CATEGORIES_KEY}`)
        ]);
        
        const mData = await mRes.json() as Material[];
        const cData = await cRes.json() as MaterialCategory[];
        
        setMaterials(Array.isArray(mData) ? mData : []);
        setCategories(Array.isArray(cData) ? cData : []);
      } catch (e: any) {
        console.error('Failed to load materials/categories from R2:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const saveToR2 = async (key: string, data: any) => {
    try {
      await apiFetch(`/api/storage?key=${key}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (e: any) {
      console.error(`Failed to save ${key} to R2:`, e);
      alert(`Error al guardar ${key}: ` + e.message);
    }
  };

  const addMaterial = async (data: Omit<Material, 'id' | 'lastUpdated' | 'priceHistory'>) => {
    const newMaterial: Material = {
      ...data,
      id: crypto.randomUUID(),
      lastUpdated: Date.now(),
      priceHistory: [{ price: data.cost, date: Date.now() }]
    };
    const updated = [newMaterial, ...materials];
    setMaterials(updated);
    await saveToR2(MATERIALS_KEY, updated);
  };

  const updateMaterial = async (id: string, updates: Partial<Material>) => {
    const updated = materials.map(m => {
      if (m.id === id) {
        const next = { ...m, ...updates };
        if (updates.cost !== undefined && updates.cost !== m.cost) {
          next.priceHistory = [...m.priceHistory, { price: updates.cost, date: Date.now() }];
          next.lastUpdated = Date.now();
        }
        return next;
      }
      return m;
    });
    setMaterials(updated);
    await saveToR2(MATERIALS_KEY, updated);
  };

  const deleteMaterial = async (id: string) => {
    const updated = materials.filter(m => m.id !== id);
    setMaterials(updated);
    await saveToR2(MATERIALS_KEY, updated);
  };

  const addCategory = async (name: string) => {
    const newCat = { id: `cat-${Date.now()}`, name };
    const updated = [...categories, newCat];
    setCategories(updated);
    await saveToR2(CATEGORIES_KEY, updated);
  };

  const deleteCategory = async (id: string) => {
    if (DEFAULT_CATEGORIES.some(c => c.id === id)) return;
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    await saveToR2(CATEGORIES_KEY, updated);
  };

  return {
    materials,
    categories,
    loading,
    error,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addCategory,
    deleteCategory
  };
}
