import type { Node, Edge } from '@xyflow/react';

export interface Piece {
  id: string;
  name: string;
  svgPath: string;
  internalClosedSvgPath?: string;
  internalOpenSvgPath?: string;
  viewBox: string;
  material?: string;
  quantity?: number;
  thickness?: string;
  area?: string;
  areaWaste?: string;
  suajeType?: string;
  materialId?: string;
  sizeData?: Record<string, {
    area?: string;
    areaWaste?: string;
    quantity?: number;
    thickness?: string;
    material?: string;
    materialId?: string;
  }>;
  isManual?: boolean;
}

export type AnnotationType = 'arrow' | 'stitching' | 'text';

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  x2?: number; // End point X
  y2?: number; // End point Y
  cx?: number; // Control point X (Bezier)
  cy?: number; // Control point Y (Bezier)
  r: number;
  s?: number;
  c?: number; // Curve bend factor (legacy/misc)
  text?: string;
  points?: { x: number; y: number }[]; // For multi-point paths
  linkedPieceId?: string; // For Ayuda Visual automation
}

export interface VisualSpecs {
  [key: string]: string | undefined;
  materialResumen?: string;
  agujeta?: string;
  agujetaId?: string;
  suela?: string;
  suelaId?: string;
  pisoSuela?: string;
  proteccion?: string;
  plantilla?: string;
  plantillaId?: string;
  ganchos?: string;
  ganchosId?: string;
  notas?: string;
}

export interface ProductVariation {
  id: string;
  name: string;
  image: string;
  extraTechnicalRows?: Piece[];
  visualSpecs?: VisualSpecs;
  pieces?: Piece[];
}

export interface Product {
  id: string;
  name: string;
  image: string; // Base64 or URL (Default image)
  createdAt: number;
  pieces?: Piece[];
  sizes?: string[]; 
  variations?: ProductVariation[];
  activeVariationId?: string;
  operationsNodes?: Node[];
  operationsEdges?: Edge[];
  assemblyState?: Record<string, Record<string, { x: number, y: number, r: number, s?: number }>>;
  annotations?: Record<string, Annotation[]>;
  variationAnnotations?: Record<string, Record<string, Annotation[]>>; // Key: VariationId, Value: { TabId: Annotation[] }
  variationSpecs?: Record<string, VisualSpecs>; // Key: VariationId
  planoPaths?: { d: string, color: string, isClosed: boolean, layer: string }[];
  planoViewBox?: string;
  planoLayerOrder?: string[];
  suajeColor?: string;
}

export type UnitOfMeasure = 'Dm2' | 'm' | 'Yardas' | 'kg' | 'g' | 'pz' | 'm²';

export interface PriceHistoryEntry {
  price: number;
  date: number;
}

export interface CustomField {
  id: string;
  label: string;
  value: string | number;
  type: 'text' | 'number';
}

export interface Material {
  id: string;
  name: string;
  categoryId: string;
  unit: UnitOfMeasure;
  cost: number;
  thicknessMin?: number; // In millimeters
  thicknessMax?: number; // In millimeters
  color?: string; // Hex color code
  image?: string; // Base64 or URL
  supplier?: string;
  customFields?: CustomField[];
  lastUpdated: number;
  priceHistory: PriceHistoryEntry[];
}

export interface MaterialCategory {
  id: string;
  name: string;
}

export interface StylePositionDefinition {
  segment: 1 | 2 | 3;
  position: number; // 1-based index within the segment
  length?: number; // How many characters this position covers (default 1)
  meaning: string;
  mappings?: Record<string, string>; // Maps specific characters (e.g., '1' or '05') to descriptions
}

export interface StyleNomenclature {
  positions: StylePositionDefinition[];
}
