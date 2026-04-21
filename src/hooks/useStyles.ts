import { useState, useEffect } from 'react';
import type { StyleNomenclature } from '../types';
import { apiFetch } from '../utils/apiClient';

const STYLES_KEY = 'style_nomenclature';

export function useStyles() {
  const [ nomenclature, setNomenclature ] = useState<StyleNomenclature>({ positions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const response = await apiFetch(`/api/storage?key=${STYLES_KEY}`);
        const data = await response.json();
        setNomenclature(data?.positions ? data : { positions: [] });
      } catch (e: any) {
        console.error('Failed to load style nomenclature from R2:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const saveNomenclature = async (updated: StyleNomenclature) => {
    const sortedPositions = [...updated.positions].sort((a, b) => {
      if (a.segment !== b.segment) return a.segment - b.segment;
      return a.position - b.position;
    });
    
    const final = { positions: sortedPositions };
    setNomenclature(final);

    try {
      await apiFetch(`/api/storage?key=${STYLES_KEY}`, {
        method: 'POST',
        body: JSON.stringify(final),
      });
    } catch (e: any) {
      console.error('Failed to save styles to R2:', e);
      alert('Error al guardar nomenclatura: ' + e.message);
    }
  };

  const updatePositionMeaning = async (segment: 1 | 2 | 3, position: number, meaning: string, length: number = 1) => {
    const existing = nomenclature.positions.find(p => p.segment === segment && p.position === position);
    const otherPositions = nomenclature.positions.filter(p => !(p.segment === segment && p.position === position));
    
    if (meaning.trim() === '' && (!existing || !existing.mappings)) {
      await saveNomenclature({ positions: otherPositions });
    } else {
      await saveNomenclature({ 
        positions: [...otherPositions, { 
          segment, 
          position, 
          length,
          meaning, 
          mappings: existing?.mappings 
        }] 
      });
    }
  };

  const updatePositionMappings = async (segment: 1 | 2 | 3, position: number, mappings: Record<string, string>, length: number = 1) => {
    const existing = nomenclature.positions.find(p => p.segment === segment && p.position === position);
    const otherPositions = nomenclature.positions.filter(p => !(p.segment === segment && p.position === position));
    
    await saveNomenclature({ 
      positions: [...otherPositions, { 
        segment, 
        position, 
        length: length || existing?.length || 1,
        meaning: existing?.meaning || '', 
        mappings 
      }] 
    });
  };

  const getMeaning = (segment: 1 | 2 | 3, position: number) => {
    return nomenclature.positions.find(p => p.segment === segment && p.position === position)?.meaning || '';
  };

  const getPosLength = (segment: 1 | 2 | 3, position: number) => {
    return nomenclature.positions.find(p => p.segment === segment && p.position === position)?.length || 1;
  };

  const getMappings = (segment: 1 | 2 | 3, position: number): Record<string, string> => {
    return nomenclature.positions.find(p => p.segment === segment && p.position === position)?.mappings || {};
  };

  return {
    nomenclature,
    loading,
    error,
    saveNomenclature,
    updatePositionMeaning,
    updatePositionMappings,
    getMeaning,
    getPosLength,
    getMappings
  };
}
