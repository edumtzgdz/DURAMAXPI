import type { Material } from '../types';

/**
 * Normalizes a string for better matching (trim, uppercase, remove multiple spaces)
 */
export const normalizeString = (str: string) => {
  return str.trim().toUpperCase().replace(/\s+/g, ' ');
};

/**
 * Attempts to find a material in the catalog that matches the given name using a scoring system.
 */
export const findMaterialMatch = (searchTerm: string, catalog: Material[]): Material | null => {
  if (!searchTerm || searchTerm === 'Sin Asignar') return null;

  const normalize = (s: string) => s.trim().toUpperCase();
  const searchNorm = normalize(searchTerm);

  // 1. Direct exact match (Priority 1)
  const exact = catalog.find(m => normalize(m.name) === searchNorm);
  if (exact) return exact;

  const extractNumbers = (s: string): string[] => s.match(/\d+/g) || [];
  const getCollapsedNumbers = (s: string) => s.replace(/\D/g, '');
  
  const searchNums = extractNumbers(searchNorm);
  const searchCollapsed = getCollapsedNumbers(searchNorm);

  const getKeywords = (s: string) => {
    return s.split(/[\s\-_/]+/)
      .map(w => normalize(w))
      .filter(w => w.length > 2 && !['CON', 'DEL', 'POR', 'LOS', 'LAS'].includes(w));
  };
  const searchKeys = getKeywords(searchNorm);

  const synonyms: Record<string, string[]> = {
    'MALLA': ['TEJIDO', 'TEXTIL', 'NET'],
    'TEJIDO': ['MALLA', 'TEXTIL'],
    'PIEL': ['CUERO', 'CARNAZA', 'BOX'],
    'CUERO': ['PIEL', 'CARNAZA'],
    'FORRO': ['CLOUDS', 'COACH', 'TEXTIL'],
    'SUELA': ['PISO', 'HULE', 'TR', 'PVC'],
    'ESPONJA': ['ESPUMA', 'FOAM', 'PU'],
    'ESPUMA': ['ESPONJA', 'FOAM', 'PU']
  };

  let bestMatch: { material: Material; score: number } | null = null;

  for (const material of catalog) {
    let score = 0;
    const matNorm = normalize(material.name);
    const matNums = extractNumbers(matNorm);
    const matCollapsed = getCollapsedNumbers(matNorm);
    const matKeys = getKeywords(matNorm);

    // 1. Collapsed Number match (e.g. 1040 vs 10/40) - Extreme boost
    if (searchCollapsed && searchCollapsed === matCollapsed) {
      score += 60;
    } else {
      // 2. Individual Number matching
      const commonNums = searchNums.filter(n => matNums.includes(n));
      score += commonNums.length * 40;
    }

    // Keyword matching
    const commonKeys = searchKeys.filter(k => matKeys.includes(k));
    score += commonKeys.length * 10;

    // Synonym matching
    for (const key of searchKeys) {
      const syns = synonyms[key];
      if (syns) {
        if (syns.some(s => matKeys.includes(s))) {
          score += 15;
        }
      }
    }

    // "Contains" bonus
    if (matNorm.includes(searchNorm) || searchNorm.includes(matNorm)) {
      score += 20;
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { material, score };
    }
  }

  // Threshold for matching: at least a significant overlap (e.g., a number or multiple keywords)
  if (bestMatch && bestMatch.score >= 30) {
    return bestMatch.material;
  }

  return null;
};
