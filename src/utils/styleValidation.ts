import type { StyleNomenclature } from '../types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  segments: string[];
  description?: string;
}

export const validateStyleName = (name: string, nomenclature?: StyleNomenclature): ValidationResult => {
  const cleanName = name.trim();
  
  // Regex: 
  // 1. (\d{3,4}) -> 3 or 4 digits
  // 2. \s -> one space
  // 3. ([a-zA-Z0-9]{3}) -> 3 alphanumeric
  // 4. (?:\s([a-zA-Z0-9]{2}))? -> optional space + 2 alphanumeric
  const regex = /^(\d{3,4})\s([a-zA-Z0-9]{3})(?:\s([a-zA-Z0-9]{2}))?$/;
  const match = cleanName.match(regex);

  if (!match) {
    // Detailed error hints
    const parts = cleanName.split(/\s+/);
    if (parts.length > 3) return { isValid: false, error: 'Demasiados segmentos (Máximo 3 separados por espacio)', segments: [] };
    
    if (parts[0] && !/^\d+$/.test(parts[0])) {
      return { isValid: false, error: 'El primer segmento debe contener solo números', segments: [] };
    }
    if (parts[0] && (parts[0].length < 3 || parts[0].length > 4)) {
      return { isValid: false, error: 'El primer segmento debe ser de 3 o 4 dígitos', segments: [] };
    }
    if (parts[1] && parts[1].length !== 3) {
      return { isValid: false, error: 'El segundo segmento debe ser de exactamente 3 caracteres', segments: [] };
    }
    if (parts[2] && parts[2].length !== 2) {
      return { isValid: false, error: 'El tercer segmento debe ser de exactamente 2 caracteres', segments: [] };
    }

    return { isValid: false, error: 'Estructura inválida. Formato: (3-4 números) (3 alfanum) [2 alfanum]', segments: [] };
  }

  const s1 = match[1];
  const s2 = match[2];
  const s3 = match[3] || '';
  const segments = [s1, s2, s3].filter(Boolean);

  // Generate description if nomenclature provided
  let description = '';
  if (nomenclature && nomenclature.positions.length > 0) {
    const descParts: string[] = [];
    
    nomenclature.positions.forEach(def => {
      let char = '';
      const len = def.length || 1;
      const start = def.position - 1;
      
      if (def.segment === 1) char = s1.substring(start, start + len);
      else if (def.segment === 2) char = s2.substring(start, start + len);
      else if (def.segment === 3 && s3) char = s3.substring(start, start + len);

      if (char) {
        const mapping = def.mappings?.[char];
        const translation = mapping ? mapping : char;
        descParts.push(`${def.meaning}: ${translation}`);
      }
    });
    
    description = descParts.join(' | ');
  }

  return { 
    isValid: true, 
    segments,
    description 
  };
};
export const getPositionTranslation = (name: string, segment: number, position: number, nomenclature?: StyleNomenclature): string => {
  const result = validateStyleName(name, nomenclature);
  if (!result.isValid || !nomenclature) return '';
  
  const s1 = result.segments[0];
  const s2 = result.segments[1];
  const s3 = result.segments[2] || '';
  
  const def = nomenclature.positions.find(p => p.segment === segment && p.position === position);
  if (!def) return '';
  
  let char = '';
  const len = def.length || 1;
  const start = def.position - 1;
  
  if (segment === 1) char = s1.substring(start, start + len);
  else if (segment === 2) char = s2.substring(start, start + len);
  else if (segment === 3) char = s3.substring(start, start + len);
  
  if (!char) return '';
  return def.mappings?.[char] || char;
};
