import { useState, useEffect } from 'react';
import type { StyleNomenclature, StylePositionDefinition } from '../types';

const STYLES_STORAGE_KEY = 'edd_style_nomenclature';

export function useStyles() {
  const [ nomenclature, setNomenclature ] = useState<StyleNomenclature>({ positions: [] });

  useEffect(() => {
    const stored = localStorage.getItem(STYLES_STORAGE_KEY);
    if (stored) {
      try {
        setNomenclature(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse style nomenclature:', e);
      }
    }
  }, []);

  const saveNomenclature = (updated: StyleNomenclature) => {
    // Sort positions logically for predictable description generation
    const sortedPositions = [...updated.positions].sort((a, b) => {
      if (a.segment !== b.segment) return a.segment - b.segment;
      return a.position - b.position;
    });
    
    const final = { positions: sortedPositions };
    setNomenclature(final);
    localStorage.setItem(STYLES_STORAGE_KEY, JSON.stringify(final));
  };

  const updatePositionMeaning = (segment: 1 | 2 | 3, position: number, meaning: string, length: number = 1) => {
    const existing = nomenclature.positions.find(p => p.segment === segment && p.position === position);
    const otherPositions = nomenclature.positions.filter(p => !(p.segment === segment && p.position === position));
    
    if (meaning.trim() === '' && (!existing || !existing.mappings)) {
      saveNomenclature({ positions: otherPositions });
    } else {
      saveNomenclature({ 
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

  const updatePositionMappings = (segment: 1 | 2 | 3, position: number, mappings: Record<string, string>, length: number = 1) => {
    const existing = nomenclature.positions.find(p => p.segment === segment && p.position === position);
    const otherPositions = nomenclature.positions.filter(p => !(p.segment === segment && p.position === position));
    
    saveNomenclature({ 
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
    saveNomenclature,
    updatePositionMeaning,
    updatePositionMappings,
    getMeaning,
    getPosLength,
    getMappings
  };
}
