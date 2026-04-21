import { useState, useEffect } from 'react';
import type { Material, MaterialCategory, UnitOfMeasure } from '../types';

const MATERIALS_STORAGE_KEY = 'edd_materials';
const CATEGORIES_STORAGE_KEY = 'edd_material_categories';

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

  useEffect(() => {
    const storedMaterials = localStorage.getItem(MATERIALS_STORAGE_KEY);
    if (storedMaterials) {
      try {
        setMaterials(JSON.parse(storedMaterials));
      } catch (e) {
        console.error('Failed to parse materials:', e);
      }
    }

    const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (storedCategories) {
      try {
        setCategories(JSON.parse(storedCategories));
      } catch (e) {
        console.error('Failed to parse categories:', e);
      }
    }
  }, []);

  const saveMaterials = (updated: Material[]) => {
    setMaterials(updated);
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(updated));
  };

  const saveCategories = (updated: MaterialCategory[]) => {
    setCategories(updated);
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
  };

  const addMaterial = (data: Omit<Material, 'id' | 'lastUpdated' | 'priceHistory'>) => {
    const newMaterial: Material = {
      ...data,
      id: crypto.randomUUID(),
      lastUpdated: Date.now(),
      priceHistory: [{ price: data.cost, date: Date.now() }]
    };
    saveMaterials([newMaterial, ...materials]);
  };

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    const updated = materials.map(m => {
      if (m.id === id) {
        const next = { ...m, ...updates };
        // If cost changed, add to history
        if (updates.cost !== undefined && updates.cost !== m.cost) {
          next.priceHistory = [...m.priceHistory, { price: updates.cost, date: Date.now() }];
          next.lastUpdated = Date.now();
        }
        return next;
      }
      return m;
    });
    saveMaterials(updated);
  };

  const deleteMaterial = (id: string) => {
    saveMaterials(materials.filter(m => m.id !== id));
  };

  const addCategory = (name: string) => {
    const newCat = { id: `cat-${Date.now()}`, name };
    saveCategories([...categories, newCat]);
  };

  const deleteCategory = (id: string) => {
    if (DEFAULT_CATEGORIES.some(c => c.id === id)) return; // Prevent deleting defaults
    saveCategories(categories.filter(c => c.id !== id));
  };

  return {
    materials,
    categories,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addCategory,
    deleteCategory
  };
}
