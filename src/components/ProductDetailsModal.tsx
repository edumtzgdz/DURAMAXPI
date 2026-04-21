import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, Reorder, useMotionTemplate, useTransform } from 'framer-motion';
import { X, Upload, Trash2, FileDown, Trash, AlertTriangle, Layers, Check, Plus, Camera, Wand2 } from 'lucide-react';
import type { Product, Piece, Annotation, AnnotationType, Material, VisualSpecs } from '../types';
import { Logo } from './Logo';
import { processDxfContent, processFullDxfContent } from '../utils/dxfProcessor';
import { findMaterialMatch } from '../utils/materialSync';
import { getPositionTranslation } from '../utils/styleValidation';
import { useMaterials } from '../hooks/useMaterials';
import { useStyles } from '../hooks/useStyles';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import { ReactFlow, Controls, applyNodeChanges, applyEdgeChanges, addEdge, Handle, Position } from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const getGrayGradient = (index: number, total: number) => {
  if (total <= 1) return '#8c8c8c';
  const start = [50, 50, 50];
  const end = [220, 221, 220];
  const p = index / (total - 1);
  const r = Math.round(start[0] + (end[0] - start[0]) * p);
  const g = Math.round(start[1] + (end[1] - start[1]) * p);
  const b = Math.round(start[2] + (end[2] - start[2]) * p);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const LOGO_SVG_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5MTciIGhlaWdodD0iNTY4IiB2aWV3Qm94PSIwIDAgOTE3LjM4IDU2OC41NCI+PHBhdGggZmlsbD0iIzFlMjkzYiIgZD0iTTg1Ny4zNyA0MzYuMjJjMCwwIC02OC4zMiwwIC02OC4zMiwwIDAsMCAtNjAuNzMsLTEzMi41MyAtNjAuNzMsLTEzMi41MyAwLDAgLTE3Ny43OSwwIC0xNzcuNzksMCAwLDAgLTkxLjg0LDE5OC44MiAtOTEuODQsMTk4LjgyIDAsMCAtOTEuODMsLTE5OC44MiAtOTEuODMsLTE5OC44MiAwLDAgLTE3Ny43OSwwIC0xNzcuNzksMCAwLDAgLTYwLjc0LDEzMi41MyAtNjAuNzQsMTMyLjUzIDAsMCAtNjguMzIsMCAtNjguMzIsMCAwLDAgLTU4LjgzLDEzMS4wMyAtNTguODMsMTMxLjAzIDAsMCAxOTEuMDMsMCAxOTEuMDMsMCAwLDAgODMuNjgsLTE4Mi41OSA4My42OCwtMTgyLjU5IDAsMCA4NC40MiwxODIuNTkgODQuNDIsMTgyLjU5IDAsMCA5OC4zOCwwIDk4LjM4LDAgMCwwIDk4LjM4LDAgOTguMzgsMCAwLDAgODQuNDIsLTE4Mi41OSA4NC40MiwtMTgyLjU5IDAsMCA4My42OCwxODIuNTkgODMuNjgsMTgyLjU5IDAsMCAxOTEuMDMsMCAxOTEuMDMsMCAwLDAgLTU4LjgzLC0xMzEuMDMgLTU4LjgzLC0xMzEuMDN6Ii8+PHBhdGggZmlsbD0iIzFlMjkzYiIgZD0iTTI4NS4wOCAxLjI5YzAsMCA2LjA1LDAgNi4wNSwwIDAsMCAzMTIuOTgsMCAzMTIuOTgsMCA1Mi4yLDQuMyA5Ny4zNCwzMi43OCAxMjMuODQsNzguMTUgMjYuNyw0NS42OSAyOS4zNCw5OS40NCA3LjI1LDE0Ny40NyAwLDAgLTE5LjI5LDQxLjk1IC0xOS4yOSw0MS45NSAwLDAgLTEzNy4zMiwwIC0xMzcuMzIsMCAwLDAgMTguOTYsLTQxLjIzIDE4Ljk2LC00MS4yMyAyLjg1LC02LjE5IDQuNzYsLTEzLjA3IDUuNywtMjAuNDcgMi44NywtMjIuNyAtNC4yNSwtNDUuNjggLTE5LjU1LC02My4wNSAtMTUuNzMsLTE3Ljg2IC0zOC40LC0yOC4xMSAtNjIuMTksLTI4LjEzIDAsMCAtNzcuNjEsLTAuMDUgLTc3LjYxLC0wLjA1IDAsMCAtMjMuMjMsMCAtMjMuMjMsMCAwLDAgLTcwLjY4LDE1Mi4zMSAtNzAuNjgsMTUyLjMxIDAsMCAtMTQzLjY5LDAgLTE0My42OSwwIDAsMCA3MC4xOCwtMTUyLjMxIDcwLjE4LC0xNTIuMzEgMCwwIC00NC43MSwwIC00NC43MSwwIDAsMCA1My4zMSwtMTE0LjY1IDUzLjMxLC0xMTQuNjV6Ii8+PC9zdmc+';


const smoothPathPoints = (pts: [number, number][], passes: number = 1, isLoop: boolean = false) => {
  if (passes <= 0) return pts;
  let smoothed = [...pts];
  for (let p = 0; p < passes; p++) {
    const next: [number, number][] = [];
    const len = smoothed.length;
    if (len < 2) return smoothed;
    for (let i = 0; i < (isLoop ? len : len - 1); i++) {
      const p1 = smoothed[i];
      const p2 = smoothed[(i + 1) % len];
      next.push([0.75 * p1[0] + 0.25 * p2[0], 0.75 * p1[1] + 0.25 * p2[1]]);
      next.push([0.25 * p1[0] + 0.75 * p2[0], 0.25 * p1[1] + 0.75 * p2[1]]);
    }
    if (!isLoop) {
      next.unshift(smoothed[0]);
      next.push(smoothed[len - 1]);
    }
    smoothed = next;
  }
  return smoothed;
};

const offsetPath = (d: string, offset: number, smoothing: number = 0) => {
  try {
    const coords = d.match(/-?\d+\.?\d*/g)?.map(Number) || [];
    if (coords.length < 6) return d;
    const pts: [number, number][] = [];
    for (let i = 0; i < coords.length; i += 2) {
      if (coords[i + 1] !== undefined) pts.push([coords[i], coords[i + 1]]);
    }

    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      area += (p1[0] * p2[1] - p2[0] * p1[1]);
    }
    const isCW = area > 0;
    const isLoop = d.toLowerCase().includes('z');

    let newPts = pts.map((p, i) => {
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const next = pts[(i + 1) % pts.length];
      const v1 = { x: p[0] - prev[0], y: p[1] - prev[1] };
      const v2 = { x: next[0] - p[0], y: next[1] - p[1] };
      const len1 = Math.sqrt(v1.x ** 2 + v1.y ** 2) || 1;
      const len2 = Math.sqrt(v2.x ** 2 + v2.y ** 2) || 1;

      const n1 = isCW ? { x: -v1.y / len1, y: v1.x / len1 } : { x: v1.y / len1, y: -v1.x / len1 };
      const n2 = isCW ? { x: -v2.y / len2, y: v2.x / len2 } : { x: v2.y / len2, y: -v2.x / len2 };

      const avgN = { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 };
      let avgLen = Math.sqrt(avgN.x ** 2 + avgN.y ** 2) || 1;
      
      if (avgLen < 0.5) avgLen = 0.5; // Miter limit

      return [p[0] + (avgN.x / avgLen) * offset, p[1] + (avgN.y / avgLen) * offset];
    });

    if (smoothing > 0) {
      newPts = smoothPathPoints(newPts as [number, number][], smoothing, isLoop);
    }

    return `M ${newPts[0][0]} ${newPts[0][1]} ${newPts.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ')} ${isLoop ? 'Z' : ''}`;
  } catch (e) { return d; }
};

const getBoundingBox = (d: string) => {
  const coords = d.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (coords.length < 2) return null;
  let minX = coords[0], maxX = coords[0], minY = coords[1], maxY = coords[1];
  for (let i = 0; i < coords.length; i += 2) {
    if (coords[i + 1] === undefined) break;
    minX = Math.min(minX, coords[i]);
    maxX = Math.max(maxX, coords[i]);
    minY = Math.min(minY, coords[i + 1]);
    maxY = Math.max(maxY, coords[i + 1]);
  }
  return { minX, maxX, minY, maxY };
};

const checkOverlaps = (box1: any, box2: any) => {
  if (!box1 || !box2) return false;
  return !(box2.minX > box1.maxX || 
           box2.maxX < box1.minX || 
           box2.minY > box1.maxY || 
           box2.maxY < box1.minY);
};

const PALETTE = [
  '#3b82f6', '#8b5cf6', '#d946ef', '#f97316', '#14b8a6', '#eab308', '#06b6d4', '#6366f1'
];

const darkenColor = (hex: string, amount: number) => {
  const h = hex.startsWith('#') ? hex : '#' + hex;
  try {
    let r = parseInt(h.slice(1, 3), 16);
    let g = parseInt(h.slice(3, 5), 16);
    let b = parseInt(h.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, r - r * amount));
    g = Math.max(0, Math.min(255, g - g * amount));
    b = Math.max(0, Math.min(255, b - b * amount));
    const rr = Math.round(r).toString(16).padStart(2, '0');
    const gg = Math.round(g).toString(16).padStart(2, '0');
    const bb = Math.round(b).toString(16).padStart(2, '0');
    return `#${rr}${gg}${bb}`;
  } catch (e) { return hex; }
};




const pieceMatchesLayer = (piece: Piece, layerName: string) => {
  if (!layerName) return false;
  const pName = piece.name.toLowerCase().trim();
  const lName = layerName.toLowerCase().trim();
  if (pName === lName) return true;

  const cleanL = lName.replace(/[-_]/g, ' ');
  const cleanP = pName.replace(/[-_]/g, ' ');

  return cleanL === cleanP;
};

const getOperationCategoryColor = (label: string) => {
  const l = (label || '').toLowerCase();
  if (l.includes('corte')) return '#3b82f6'; // blue
  if (l.includes('rebajado')) return '#f97316'; // orange
  if (l.includes('rayado')) return '#10b981'; // green
  if (l.includes('costura') || l.includes('union') || l.includes('unión') || l.includes('pespunte')) return '#8b5cf6'; // violet
  return '#6366f1'; // indigo/default
};


const stringToColor = (str: string) => {
  if (!str || str === 'Sin Asignar') return '#64748b';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

const svgToPngDataUrl = (piece: Piece, materialColor: string): Promise<string> => {
  return new Promise((resolve) => {
    const svgInner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${piece.viewBox}" preserveAspectRatio="xMidYMid meet" width="150" height="150">
       <path d="${piece.svgPath}" fill="${materialColor}" stroke="rgba(0,0,0,0.1)" stroke-width="2" vector-effect="non-scaling-stroke" />
       ${piece.internalClosedSvgPath ? `<path d="${piece.internalClosedSvgPath}" fill="#f3f4f6" stroke="#ff4444" stroke-width="1.5" vector-effect="non-scaling-stroke" />` : ''}
       ${piece.internalOpenSvgPath ? `<path d="${piece.internalOpenSvgPath}" fill="none" stroke="#00C851" stroke-width="1.5" stroke-dasharray="4,3" vector-effect="non-scaling-stroke" />` : ''}
    </svg>`;

    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgInner);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(0, 150);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0, 150, 150);
        resolve(canvas.toDataURL('image/png'));
      } else resolve('');
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
};

const suajeToPngDataUrl = (piece: Piece): Promise<string> => {
  return new Promise((resolve) => {
    const svgInner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${piece.viewBox}" preserveAspectRatio="xMidYMid meet" width="800" height="800">
       <path d="${piece.svgPath}" fill="none" stroke="#1e293b" stroke-width="2" vector-effect="non-scaling-stroke" />
       ${piece.internalClosedSvgPath ? `<path d="${piece.internalClosedSvgPath}" fill="rgba(239, 68, 68, 0.05)" stroke="#ef4444" stroke-width="1.5" vector-effect="non-scaling-stroke" />` : ''}
       ${piece.internalOpenSvgPath ? `<path d="${piece.internalOpenSvgPath}" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,3" vector-effect="non-scaling-stroke" />` : ''}
    </svg>`;

    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgInner);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800; // High res for PDF
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(0, 800);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0, 800, 800);
        resolve(canvas.toDataURL('image/png'));
      } else resolve('');
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
};

// Color naming helper for Suajes
const BASE_SUAJE_COLORS = [
  { hex: '#ef4444', name: 'Rojo' },
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#10b981', name: 'Verde' },
  { hex: '#f59e0b', name: 'Amarillo' },
  { hex: '#1e293b', name: 'Negro' },
  { hex: '#94a3b8', name: 'Plata' },
  { hex: '#ffffff', name: 'Blanco' }
];

const getClosestSuajeColorName = (hex: string) => {
  if (!hex) return 'SIN ESPECIFICAR';

  // Simple RGB distance calculation
  const hToRgb = (h: string) => {
    const r = parseInt(h.substring(1, 3), 16);
    const g = parseInt(h.substring(3, 5), 16);
    const b = parseInt(h.substring(5, 7), 16);
    return { r, g, b };
  };

  const darkenColor = (hex: string, amount: number) => {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.max(0, Math.min(255, r - r * amount));
    g = Math.max(0, Math.min(255, g - g * amount));
    b = Math.max(0, Math.min(255, b - b * amount));

    const rr = Math.round(r).toString(16).padStart(2, '0');
    const gg = Math.round(g).toString(16).padStart(2, '0');
    const bb = Math.round(b).toString(16).padStart(2, '0');

    return `#${rr}${gg}${bb}`;
  };

  const target = hToRgb(hex);
  let closestMatch = BASE_SUAJE_COLORS[0];
  let minDistance = Infinity;

  BASE_SUAJE_COLORS.forEach(base => {
    const brgb = hToRgb(base.hex);
    const distance = Math.sqrt(
      Math.pow(target.r - brgb.r, 2) +
      Math.pow(target.g - brgb.g, 2) +
      Math.pow(target.b - brgb.b, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = base;
    }
  });

  return closestMatch.name;
};

// Helper to generate a smooth path through points using Cardinal Splines
const getCurvePath = (points: { x: number, y: number }[], tension = 0.5) => {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let pathData = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 === points.length ? i + 1 : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

    pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return pathData;
};

const InteractiveAssemblyPiece = ({
  piece,
  operationId,
  initialState,
  onTransformEnd,
  isSelected,
  onSelect
}: {
  piece: Piece;
  operationId: string;
  initialState?: { x: number; y: number; r: number; s?: number };
  onTransformEnd: (operationId: string, pieceId: string, state: { x: number; y: number; r: number; s?: number }) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}) => {
  const x = useMotionValue(initialState?.x || 0);
  const y = useMotionValue(initialState?.y || 0);
  const r = useMotionValue(initialState?.r || 0);
  const s = useMotionValue(initialState?.s || 1);
  const [isRotating, setIsRotating] = useState(false);
  const centerRef = useRef<HTMLDivElement>(null);
  const materialColor = stringToColor(piece.material || 'Sin Asignar');
  const inverseScale = useTransform(s, (v) => 1 / v);

  const handleRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect?.();
    setIsRotating(true);
    const rect = centerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;
      r.set((Math.atan2(dy, dx) * 180) / Math.PI + 90);
    };

    const onPointerUp = () => {
      setIsRotating(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      onTransformEnd(operationId, piece.id, { x: x.get(), y: y.get(), r: r.get(), s: s.get() });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleScaleStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect?.();
    setIsRotating(true);
    const rect = centerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
    const startScale = s.get();

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const currentDist = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
      const newScale = startScale * (currentDist / startDist);
      s.set(Math.max(0.2, newScale));
    };

    const onPointerUp = () => {
      setIsRotating(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      onTransformEnd(operationId, piece.id, { x: x.get(), y: y.get(), r: r.get(), s: s.get() });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <motion.div
      ref={centerRef}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        x,
        y,
        rotate: r,
        scale: s,
        width: 150,
        height: 150,
        marginLeft: -75,
        marginTop: -75,
        touchAction: 'none',
        zIndex: isSelected ? 50 : 10,
        outline: isSelected ? '2px dashed var(--accent-color)' : 'none',
        outlineOffset: 8,
        borderRadius: '8px'
      }}
      drag={!isRotating}
      dragMomentum={false}
      onDragStart={() => onSelect?.()}
      onDragEnd={() => onTransformEnd(operationId, piece.id, { x: x.get(), y: y.get(), r: r.get(), s: s.get() })}
      onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
    >
      <AnimatePresence>
        {isSelected && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              onPointerDown={handleRotateStart}
              style={{
                position: 'absolute',
                top: -35,
                left: '50%',
                x: '-50%',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--accent-color)',
                border: '2px solid white',
                cursor: 'grab',
                zIndex: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '16px',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                scale: inverseScale
              }}
              title="Arrastrar para rotar"
            >
              ↻
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              onPointerDown={handleScaleStart}
              style={{
                position: 'absolute',
                bottom: -15,
                right: -15,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--text-secondary)',
                border: '2px solid white',
                cursor: 'nwse-resize',
                zIndex: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                scale: inverseScale
              }}
              title="Arrastrar para escalar"
            >
              ⤡
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <svg viewBox={piece.viewBox} style={{ width: '100%', height: '100%', transform: 'scaleY(-1)', overflow: 'visible', filter: isSelected ? 'drop-shadow(0 0 8px var(--accent-color))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}>
        <path d={piece.svgPath} style={{ fill: materialColor, stroke: 'rgba(0,0,0,0.1)', strokeWidth: '1.5px', vectorEffect: 'non-scaling-stroke' }} />
        {piece.internalClosedSvgPath && <path d={piece.internalClosedSvgPath} style={{ fill: 'rgba(0,0,0,0.1)', stroke: '#ff4444', strokeWidth: '1.5px', vectorEffect: 'non-scaling-stroke' }} />}
        {piece.internalOpenSvgPath && <path d={piece.internalOpenSvgPath} style={{ fill: 'none', stroke: '#00C851', strokeWidth: '1.5px', strokeDasharray: '4,3', vectorEffect: 'non-scaling-stroke' }} />}

        {(() => {
          const parts = piece.viewBox.split(' ').map(Number);
          if (parts.length === 4) {
            const [mx, my, w, h] = parts;
            const cx = mx + w / 2;
            const cy = my + h / 2;
            return (
              <text
                x={cx}
                y={cy}
                fill="black"
                style={{
                  fontSize: `${Math.max(6, w / 18)}px`,
                  fontWeight: 'bold',
                  textAnchor: 'middle',
                  dominantBaseline: 'middle',
                  transform: 'scaleY(-1)',
                  transformOrigin: `${cx}px ${cy}px`,
                  pointerEvents: 'none',
                  fontFamily: 'sans-serif'
                }}
              >
                {piece.name} (x{piece.quantity || 2})
              </text>
            );
          }
          return null;
        })()}
      </svg>
    </motion.div>
  );
};

const InteractiveAnnotationItem = ({
  annotation,
  operationId,
  onTransformEnd,
  onDelete,
  onTextChange,
  isSelected,
  onSelect
}: {
  annotation: Annotation;
  operationId: string;
  onTransformEnd: (operationId: string, annId: string, state: Partial<Annotation>) => void;
  onDelete: (operationId: string, annId: string) => void;
  onTextChange?: (operationId: string, annId: string, text: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
}) => {
  const x = useMotionValue(annotation.x || 0);
  const y = useMotionValue(annotation.y || 0);
  const x2 = useMotionValue(annotation.x2 || 100);
  const y2 = useMotionValue(annotation.y2 || 0);
  const cx = useMotionValue(annotation.cx || 50);
  const cy = useMotionValue(annotation.cy || -20);
  const r = useMotionValue(annotation.r || 0);
  const s = useMotionValue(annotation.s || 1);

  const [isRotating, setIsRotating] = useState(false);
  const centerRef = useRef<HTMLDivElement>(null);
  const inverseScale = useTransform(s, (v) => 1 / v);

  // Sync motion values if annotation prop changes
  useEffect(() => {
    x.set(annotation.x || 0);
    y.set(annotation.y || 0);
    if (annotation.x2 !== undefined) x2.set(annotation.x2);
    if (annotation.y2 !== undefined) y2.set(annotation.y2);
    if (annotation.cx !== undefined) cx.set(annotation.cx);
    if (annotation.cy !== undefined) cy.set(annotation.cy);
    r.set(annotation.r || 0);
    s.set(annotation.s || 1);
  }, [annotation.id]);

  // Handle Point dragging (End, Control or Array points)
  const handlePointDragStart = (e: React.PointerEvent, pointKey: string, index?: number) => {
    e.stopPropagation();
    onSelect?.();
    setIsRotating(true);

    let startX: number, startY: number;

    if (index !== undefined && annotation.points) {
      startX = annotation.points[index].x;
      startY = annotation.points[index].y;
    } else if (pointKey === 'c') {
      startX = cx.get();
      startY = cy.get();
    } else {
      startX = x2.get();
      startY = y2.get();
    }

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = (moveEvent.clientX - startPointerX) / s.get();
      const dy = (moveEvent.clientY - startPointerY) / s.get();

      if (index !== undefined && annotation.points) {
        // Local simulation here if needed
      } else if (pointKey === 'c') {
        cx.set(startX + dx);
        cy.set(startY + dy);
      } else {
        x2.set(startX + dx);
        y2.set(startY + dy);
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      setIsRotating(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      const dx = (upEvent.clientX - startPointerX) / s.get();
      const dy = (upEvent.clientY - startPointerY) / s.get();

      if (index !== undefined && annotation.points) {
        const newPoints = [...annotation.points];
        newPoints[index] = { x: startX + dx, y: startY + dy };
        onTransformEnd(operationId, annotation.id, { points: newPoints });
      } else if (pointKey === 'c') {
        onTransformEnd(operationId, annotation.id, { cx: cx.get(), cy: cy.get() });
      } else {
        onTransformEnd(operationId, annotation.id, { x2: x2.get(), y2: y2.get() });
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect?.();
    setIsRotating(true);
    const rect = centerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;
      r.set((Math.atan2(dy, dx) * 180) / Math.PI + 90);
    };

    const onPointerUp = () => {
      setIsRotating(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      onTransformEnd(operationId, annotation.id, { r: r.get() });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleScaleStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect?.();
    setIsRotating(true);
    const rect = centerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
    const startScale = s.get();

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const currentDist = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
      const newScale = startScale * (currentDist / startDist);
      s.set(Math.max(0.2, newScale));
    };

    const onPointerUp = () => {
      setIsRotating(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      onTransformEnd(operationId, annotation.id, { s: s.get() });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // SVG Path generation
  const pathD = useMotionTemplate`${annotation.type === 'stitching'
    ? (annotation.points ? getCurvePath(annotation.points) : `M 0 0 Q ${cx} ${cy} ${x2} ${y2}`)
    : `M 0 0 L ${x2} ${y2}`}`;

  // Calculate arrow rotation for the head
  const arrowAngle = useTransform([x2, y2], ([vx2, vy2]) => {
    return (Math.atan2(vy2 as number, vx2 as number) * 180) / Math.PI;
  });

  return (
    <motion.div
      ref={centerRef}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        x,
        y,
        rotate: r,
        scale: s,
        width: annotation.type === 'text' ? 200 : 1,
        height: annotation.type === 'text' ? 100 : 1,
        touchAction: 'none',
        zIndex: isSelected ? 500 : 400
      }}
      drag={!isRotating}
      dragMomentum={false}
      onDragStart={() => onSelect?.()}
      onDragEnd={() => onTransformEnd(operationId, annotation.id, { x: x.get(), y: y.get() })}
      onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
    >
      <AnimatePresence>
        {isSelected && (
          <>
            {/* End Point Handle (Arrow / Basic Stitching) */}
            {(annotation.type === 'arrow' || (annotation.type === 'stitching' && !annotation.points)) && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                onPointerDown={(e) => handlePointDragStart(e, '')}
                style={{
                  position: 'absolute',
                  x: x2,
                  y: y2,
                  width: 14,
                  height: 14,
                  marginLeft: -7,
                  marginTop: -7,
                  borderRadius: '50%',
                  background: 'var(--accent-color)',
                  border: '1px solid white',
                  cursor: 'move',
                  zIndex: 110,
                  scale: inverseScale
                }}
                title="Ajustar punto final"
              />
            )}

            {/* Path Points Handles (Multi-point Stitching) */}
            {annotation.type === 'stitching' && annotation.points && annotation.points.map((p, i) => (
              <motion.div
                key={`p-${i}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                onPointerDown={(e) => handlePointDragStart(e, '', i)}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: 12,
                  height: 12,
                  marginLeft: -6,
                  marginTop: -6,
                  borderRadius: '50%',
                  background: i === 0 ? 'var(--accent-color)' : '#00C851',
                  border: '1px solid white',
                  cursor: 'move',
                  zIndex: 110,
                  scale: inverseScale
                }}
                title={`Mover punto ${i + 1}`}
              />
            ))}

            {/* Control Point Handle (Basic Stitching) */}
            {annotation.type === 'stitching' && !annotation.points && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                onPointerDown={(e) => handlePointDragStart(e, 'c')}
                style={{
                  position: 'absolute',
                  x: cx,
                  y: cy,
                  width: 12,
                  height: 12,
                  marginLeft: -6,
                  marginTop: -6,
                  borderRadius: '50%',
                  background: '#00C851',
                  border: '1px solid white',
                  cursor: 'move',
                  zIndex: 110,
                  scale: inverseScale
                }}
                title="Ajustar curva"
              />
            )}

            {/* General Handles (Rotate) */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              onPointerDown={handleRotateStart}
              style={{
                position: 'absolute',
                top: -30,
                left: 0,
                width: 20,
                height: 20,
                marginLeft: -10,
                borderRadius: '50%',
                background: '#ffbb33',
                border: '1.5px solid white',
                cursor: 'grab',
                zIndex: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '11px',
                color: 'white',
                scale: inverseScale
              }}
              title="Rotar todo"
            >↻</motion.div>

            {annotation.type === 'text' && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                onPointerDown={handleScaleStart}
                style={{
                  position: 'absolute',
                  bottom: -10,
                  right: -10,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#ffbb33',
                  border: '1.5px solid white',
                  cursor: 'nwse-resize',
                  zIndex: 100,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '10px',
                  color: 'white',
                  scale: inverseScale
                }}
                title="Escalar tamaño"
              >⤡</motion.div>
            )}

            {/* Delete button */}
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => { e.stopPropagation(); onDelete(operationId, annotation.id); }}
              style={{
                position: 'absolute',
                top: -10,
                right: -10,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#ff4444',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                zIndex: 120,
                scale: inverseScale
              }}
            >✕</motion.button>
          </>
        )}
      </AnimatePresence>

      {/* SVG Path Rendering */}
      {(annotation.type === 'arrow' || annotation.type === 'stitching') && (
        <svg style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none' }}>
          {/* Shadow/Outline for better visibility */}
          <motion.path
            d={pathD}
            style={{
              fill: 'none',
              stroke: 'rgba(0,0,0,0.15)',
              strokeWidth: 4,
              vectorEffect: 'non-scaling-stroke',
              strokeLinecap: 'round'
            }}
          />
          <motion.path
            d={pathD}
            style={{
              fill: 'none',
              stroke: annotation.type === 'stitching' ? '#00C851' : 'var(--accent-color)',
              strokeWidth: 2,
              vectorEffect: 'non-scaling-stroke',
              strokeDasharray: annotation.type === 'stitching' ? '4,3' : 'none',
              strokeLinecap: 'round'
            }}
          />

          {/* Arrow Head */}
          {annotation.type === 'arrow' && (
            <motion.path
              d="M -6 -4 L 0 0 L -6 4"
              style={{
                fill: 'none',
                stroke: 'var(--accent-color)',
                strokeWidth: 2,
                vectorEffect: 'non-scaling-stroke',
                x: x2,
                y: y2,
                rotate: arrowAngle
              }}
            />
          )}
        </svg>
      )}

      {annotation.type === 'text' && (
        <textarea
          className="annotation-text"
          value={annotation.text}
          onChange={(e) => onTextChange?.(operationId, annotation.id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(51, 136, 255, 0.05)',
            border: isSelected ? '1px solid var(--accent-color)' : '1px solid transparent',
            color: 'var(--text-primary)',
            resize: 'none',
            padding: '8px',
            fontSize: '14px',
            borderRadius: '6px',
            textAlign: 'center'
          }}
        />
      )}
    </motion.div>
  );
};

const OperationCustomNode = ({ id, data, selected }: any) => {
  const color = getOperationCategoryColor(data.label);
  const isSelected = selected;

  return (
    <div style={{
      padding: 0,
      background: 'var(--surface-color)',
      border: `2px solid ${isSelected ? 'var(--accent-color)' : color}`,
      borderRadius: '10px',
      minWidth: '200px',
      boxShadow: isSelected ? '0 0 0 2px var(--accent-color), 0 20px 25px -5px rgba(0, 0, 0, 0.1)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
      transform: isSelected ? 'translateY(-2px)' : 'none'
    }}>
      <div style={{ height: '6px', background: color, width: '100%' }} />
      <div style={{ padding: '12px 15px', position: 'relative' }}>
        <Handle type="target" position={Position.Top} style={{ background: color, width: '8px', height: '8px', border: '2px solid var(--surface-color)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <textarea
            className="nodrag"
            value={data.label || ''}
            onChange={(e) => data.onChangeLabel?.(id, e.target.value)}
            onBlur={() => data.onSaveLabel?.()}
            rows={3}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              textAlign: 'center',
              outline: 'none',
              padding: '0.4rem',
              borderRadius: '4px',
              resize: 'none',
              overflow: 'hidden',
              fontFamily: 'inherit',
              display: 'block',
              lineHeight: '1.4'
            }}
            placeholder="Nombre operación..."
          />
          <button
            className="nodrag"
            onClick={() => data.onDelete?.(id)}
            style={{
              alignSelf: 'flex-end',
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              opacity: 0.4,
              transition: 'opacity 0.2s',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
            title="Eliminar operación"
          >
            <Trash size={14} />
          </button>
        </div>
        <Handle type="source" position={Position.Bottom} style={{ background: color, width: '8px', height: '8px', border: '2px solid var(--surface-color)' }} />
      </div>
    </div>
  );
};

const rfNodeTypes = {
  operation: OperationCustomNode,
};

interface MaterialCellProps {
  currentMaterial: string;
  materialId?: string;
  catalog: Material[];
  onAssign: (matId: string, matName: string) => void;
  onOpenCatalog: (initialData: any, onAssign?: (id: string, name: string) => void) => void;
  showNoneOption?: boolean;
}

const MaterialCell = ({ currentMaterial, materialId, catalog, onAssign, onOpenCatalog, showNoneOption }: MaterialCellProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const matchedMaterial = materialId && materialId !== 'none' ? catalog.find(m => m.id === materialId) : null;
  const isSynced = !!matchedMaterial || materialId === 'none';
  const displayName = materialId === 'none' ? 'NINGUNO / N/A' : (matchedMaterial ? matchedMaterial.name : currentMaterial);

  return (
    <div 
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minHeight: '30px', width: '100%' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span style={{ 
        color: isSynced ? '#1e293b' : '#f59e0b', 
        fontWeight: isSynced ? 'bold' : 'normal',
        fontSize: '13px',
        paddingLeft: '8px'
      }}>
        {displayName}
      </span>

      {isSynced ? (
        <Check size={14} color="#10b981" />
      ) : (
        <span title="Material no sincronizado con el catálogo">
          <AlertTriangle size={14} color="#f59e0b" />
        </span>
      )}

      {isHovered && (
        <div className="glass-panel" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 1000,
          minWidth: '220px',
          padding: '12px',
          background: 'white',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>ASIGNAR MATERIAL:</p>
          <select 
            style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            value={materialId || ''}
            onChange={(e) => {
              if (e.target.value === 'none') {
                onAssign('none', 'NINGUNO / N/A');
                return;
              }
              const selected = catalog.find(m => m.id === e.target.value);
              if (selected) onAssign(selected.id, selected.name);
            }}
          >
            <option value="">Seleccionar...</option>
            {showNoneOption && <option value="none">NINGUNO / N/A</option>}
            {catalog.map((m, idx) => (
              <option key={m.id || `mat-${idx}`} value={m.id}>{m.name.toUpperCase()}</option>
            ))}
          </select>
          <button 
            className="cta-button"
            style={{ padding: '6px', fontSize: '11px', background: 'var(--accent-color)', height: 'auto', borderRadius: '4px' }}
            onClick={() => onOpenCatalog({ name: currentMaterial }, onAssign)}
          >
            Buscar en Catálogo...
          </button>
        </div>
      )}
    </div>
  );
};

interface ProductDetailsModalProps {
  product: Product | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  onOpenCatalog?: (initialData?: any) => void;
}

export function ProductDetailsModal({ product, onClose, onUpdate, onOpenCatalog }: ProductDetailsModalProps) {
  const { materials: catalogMaterials } = useMaterials();
  const { nomenclature } = useStyles();
  const [activeTab, setActiveTab] = useState<string>('portada');
  const [currentVariationId, setCurrentVariationId] = useState<string>('base');
  const currentVariation = (product?.variations || []).find(v => v.id === currentVariationId) || { id: 'base', name: product?.name || '', image: product?.image || '', pieces: product?.pieces || [], visualSpecs: {} };
  // const containerRef = useRef<HTMLDivElement>(null);
  const visualCanvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dxfInputRef = useRef<HTMLInputElement>(null);
  const planoInputRef = useRef<HTMLInputElement>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [dxfError, setDxfError] = useState('');
  const [fullscreenPiece, setFullscreenPiece] = useState<Piece | null>(null);
  const [selectedFichaSize, setSelectedFichaSize] = useState<string>('27');
  const [selectedSuajePieceId, setSelectedSuajePieceId] = useState<string | null>(null);
  const [showSuajeExportModal, setShowSuajeExportModal] = useState(false);
  const [suajeExportSelection, setSuajeExportSelection] = useState<Set<string>>(new Set());
  // const canvasRef = useRef<SVGSVGElement>(null);
  const [stitchingSession, setStitchingSession] = useState<{
    nodeId: string;
    step: 'BOTTOM' | 'TOP';
    bottomLayer?: string;
  } | null>(null);

  const [empalmeSession, setEmpalmeSession] = useState<{
    nodeId: string;
    step: 'MAIN' | 'SECONDARY';
    mainLayer?: string;
    selectedSecondaries: string[];
    suggestedLayers: string[];
  } | null>(null);

  const [editingStitch, setEditingStitch] = useState<{ nodeId: string; index: number } | null>(null);

  const getTrimmedPath = (d: string, startPct: number = 0, endPct: number = 100) => {
    if ((startPct === 0 || startPct === undefined) && (endPct === 100 || endPct === undefined)) return d;

    try {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      const totalLength = path.getTotalLength();

      const sVal = startPct || 0;
      const eVal = endPct === undefined ? 100 : endPct;

      const start = (totalLength * Math.max(0, sVal)) / 100;
      const end = (totalLength * Math.min(100, eVal)) / 100;

      if (start >= end) return '';

      let newD = '';
      const step = 2;
      for (let l = start; l <= end; l += step) {
        const pt = path.getPointAtLength(l);
        newD += (newD === '' ? 'M' : 'L') + ` ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
      }
      const endPt = path.getPointAtLength(end);
      newD += ` L ${endPt.x.toFixed(2)} ${endPt.y.toFixed(2)}`;
      return newD;
    } catch (e) {
      return d;
    }
  };

  const formatDecimal = (val: string | number | undefined) => {
    if (val === undefined || val === '') return '';
    const num = parseFloat(val.toString().replace(',', '.'));
    if (isNaN(num)) return val.toString();
    return num.toFixed(2);
  };

  const applyAutoOperations = (pieces: Piece[], currentNodes: any[], currentEdges: any[]) => {
    let changed = false;

    // 1. Get unique materials
    const materials = Array.from(new Set(pieces.map(p => (p.material || 'Sin Asignar').toUpperCase())));
    const corteLabels = materials.map(m => `CORTE DE COMPONENTES DE ${m}`);

    // 2. Identify needs per material
    const materialsNeedingSkiving = new Set(
      pieces
        .filter(p => {
          const mat = (p.material || '').toLowerCase();
          const thickness = parseFloat((p.thickness || '0').replace(',', '.'));
          return (mat.includes('piel') || mat.includes('microfibra')) && thickness >= 1.5;
        })
        .map(p => (p.material || 'Sin Asignar').toUpperCase())
    );

    const materialsNeedingContrahorte = new Set(
      pieces
        .filter(p => {
          const mat = (p.material || '').toLowerCase();
          return mat.includes('beta') || mat.includes('horotermo') || mat.includes('orotermo');
        })
        .map(p => (p.material || 'Sin Asignar').toUpperCase())
    );

    const materialsNeedingRayado = new Set(
      pieces
        .filter(p => !!p.internalOpenSvgPath)
        .map(p => (p.material || 'Sin Asignar').toUpperCase())
    );

    const skivingLabels = Array.from(materialsNeedingSkiving).map(m => `REBAJADO DE COMPONENTES DE ${m}`);
    const contrahorteLabels = Array.from(materialsNeedingContrahorte).map(m => `REBAJADO DE CONTRAHORTE DE ${m}`);
    const rayadoLabels = Array.from(materialsNeedingRayado).map(m => `RAYADO DE COMPONENTES DE ${m}`);

    // 3. Sync Nodes
    let finalNodes = [...currentNodes];

    // Remove obsolete nodes
    const filteredNodes = finalNodes.filter(node => {
      const label = (node.data?.label || '').toUpperCase();
      if (label.startsWith('CORTE DE COMPONENTES DE ')) {
        const isStillValid = corteLabels.includes(label);
        if (!isStillValid) changed = true;
        return isStillValid;
      }
      if (label.startsWith('RAYADO DE COMPONENTES DE ')) {
        const isStillValid = rayadoLabels.includes(label);
        if (!isStillValid) changed = true;
        return isStillValid;
      }
      if (label.startsWith('REBAJADO DE COMPONENTES DE ')) {
        const isStillValid = skivingLabels.includes(label);
        if (!isStillValid) changed = true;
        return isStillValid;
      }
      if (label.startsWith('REBAJADO DE CONTRAHORTE DE ')) {
        const isStillValid = contrahorteLabels.includes(label);
        if (!isStillValid) changed = true;
        return isStillValid;
      }
      // Keep other manual nodes
      return true;
    });

    if (filteredNodes.length !== finalNodes.length) {
      finalNodes = filteredNodes;
      changed = true;
    }

    // Add missing nodes
    const allExpectedLabels = [
      ...corteLabels,
      ...skivingLabels,
      ...contrahorteLabels,
      ...rayadoLabels
    ];

    allExpectedLabels.forEach((label) => {
      if (!finalNodes.some(n => (n.data?.label || '').toUpperCase() === label)) {
        let type = 'corte';
        if (label.startsWith('REBAJADO')) type = 'rebajado';
        if (label.startsWith('RAYADO')) type = 'rayado';

        finalNodes.push({
          id: `op-${type}-${label.replace(/\s+/g, '-')}-${Date.now()}`,
          position: { x: 0, y: 0 }, // Will be set in distribution
          data: { label: label },
          type: 'operation'
        });
        changed = true;
      }
    });

    // 4. Distribution and Layout (Parallel Vertical Flow)
    const HORIZONTAL_GAP = 300;
    const LEVEL_Y = {
      CORTE: 50,
      REBAJADO: 300,
      RAYADO: 550,
      OTROS: 800
    };

    // Sort materials to ensure consistent column assignment
    const sortedMaterials = [...materials].sort();

    const occupiedPositions = new Set<string>();

    finalNodes.forEach((node) => {
      const label = (node.data?.label || '').toUpperCase();
      let newPos = { ...node.position };

      // Find which material this node belongs to - Use best match (longest)
      const matchedMaterials = sortedMaterials.filter(m => label.includes(m));
      const bestMat = matchedMaterials.length > 0
        ? matchedMaterials.sort((a, b) => b.length - a.length)[0]
        : null;
      const matIndex = bestMat ? sortedMaterials.indexOf(bestMat) : -1;

      if (matIndex !== -1) {
        const x = matIndex * HORIZONTAL_GAP;
        if (label.startsWith('CORTE')) {
          newPos = { x, y: LEVEL_Y.CORTE };
        } else if (label.startsWith('REBAJADO')) {
          newPos = { x, y: LEVEL_Y.REBAJADO };
        } else if (label.startsWith('RAYADO')) {
          newPos = { x, y: LEVEL_Y.RAYADO };
        }
      } else {
        // Handle nodes that don't match specific materials (manual or others)
        const otherNodes = finalNodes.filter(n => {
          const l = (n.data?.label || '').toUpperCase();
          return !sortedMaterials.some(m => l.includes(m));
        });
        const otherIdx = otherNodes.findIndex(n => n.id === node.id);
        if (otherIdx !== -1) {
          const row = Math.floor(otherIdx / 3);
          const col = otherIdx % 3;
          newPos = { x: col * HORIZONTAL_GAP, y: LEVEL_Y.OTROS + (row * 200) };
        }
      }

      // Basic collision avoidance
      let posKey = `${Math.round(newPos.x)},${Math.round(newPos.y)}`;
      let attempts = 0;
      while (occupiedPositions.has(posKey) && attempts < 10) {
        newPos.x += 40;
        newPos.y += 40;
        posKey = `${Math.round(newPos.x)},${Math.round(newPos.y)}`;
        attempts++;
      }
      occupiedPositions.add(posKey);

      if (Math.abs(newPos.x - node.position.x) > 1 || Math.abs(newPos.y - node.position.y) > 1) {
        node.position = newPos;
        changed = true;
      }
    });

    // 5. Sync Edges
    let finalEdges = [...currentEdges];
    const nodeIds = new Set(finalNodes.map(n => n.id));

    // Remove obsolete edges
    const filteredEdges = finalEdges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));
    if (filteredEdges.length !== finalEdges.length) {
      finalEdges = filteredEdges;
      changed = true;
    }

    // Connect per material: Corte -> Rebajado -> Rayado
    sortedMaterials.forEach((mat) => {
      const corteNode = finalNodes.find(n => (n.data?.label || '').toUpperCase() === `CORTE DE COMPONENTES DE ${mat}`);
      const skivingNode = finalNodes.find(n => (n.data?.label || '').toUpperCase() === `REBAJADO DE COMPONENTES DE ${mat}`);
      const contraNode = finalNodes.find(n => (n.data?.label || '').toUpperCase() === `REBAJADO DE CONTRAHORTE DE ${mat}`);
      const rayNode = finalNodes.find(n => (n.data?.label || '').toUpperCase() === `RAYADO DE COMPONENTES DE ${mat}`);

      // Helper to add edge if missing
      const addEdgeIfMissing = (source: any, target: any) => {
        if (source && target && !finalEdges.some(e => e.source === source.id && e.target === target.id)) {
          finalEdges.push({
            id: `edge-${source.id}-${target.id}`,
            source: source.id,
            target: target.id,
            animated: true
          });
          changed = true;
        }
      };

      // Order: Corte -> Rebajado/Contra -> Rayado
      const firstLevelNode = corteNode;
      const secondLevelNode = skivingNode || contraNode;
      const thirdLevelNode = rayNode;

      if (firstLevelNode && secondLevelNode) {
        addEdgeIfMissing(firstLevelNode, secondLevelNode);
        if (thirdLevelNode) {
          addEdgeIfMissing(secondLevelNode, thirdLevelNode);
        }
      } else if (firstLevelNode && thirdLevelNode) {
        addEdgeIfMissing(firstLevelNode, thirdLevelNode);
      }
    });

    return { updatedNodes: finalNodes, updatedEdges: finalEdges, changed };
  };

  const handleAutoLayout = () => {
    if (!product) return;
    const { updatedNodes, updatedEdges } = applyAutoOperations((product.pieces || []), nodes, edges);
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    onUpdate(product.id, { operationsNodes: updatedNodes, operationsEdges: updatedEdges });
  };

  // Flow State
  const [nodes, setNodes] = useState<any[]>(product?.operationsNodes || []);
  const [edges, setEdges] = useState<any[]>(product?.operationsEdges || []);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [drawingMode, setDrawingMode] = useState<'none' | 'stitching'>('none');
  const [tempPoints, setTempPoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // Plano Measurement State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [savedMeasurements, setSavedMeasurements] = useState<{ start: { x: number, y: number }, end: { x: number, y: number }, id: string }[]>([]);
  const [measureStart, setMeasureStart] = useState<{ x: number, y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number, y: number } | null>(null);

  // Plano Layers State
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [orderedLayers, setOrderedLayers] = useState<string[]>([]);

  // Plano 3D State
  const [is3D, setIs3D] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [explosion, setExplosion] = useState(0);
  const [planoScale, setPlanoScale] = useState(1);
  const [planoPan, setPlanoPan] = useState({ x: 0, y: 0 });
  const [isDraggingPlano, setIsDraggingPlano] = useState<'none' | 'rotate' | 'pan'>('none');
  const [selectionModeNodeId, setSelectionModeNodeId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [startRotation, setStartRotation] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const getSvgCoords = (e: React.MouseEvent | React.TouchEvent, svgElement: SVGSVGElement) => {
    const pt = svgElement.createSVGPoint();
    if ('clientX' in e) {
      pt.x = e.clientX;
      pt.y = e.clientY;
    } else {
      pt.x = e.touches[0].clientX;
      pt.y = e.touches[0].clientY;
    }
    const cursorPT = pt.matrixTransform(svgElement.getScreenCTM()?.inverse());
    return { x: cursorPT.x, y: cursorPT.y };
  };

  // Sync state when product ID changes (detect opening a different product or reload)
  useEffect(() => {
    if (product) {
      setNodes(product.operationsNodes || []);
      setEdges(product.operationsEdges || []);

      // If no variations exist, initialize with the base model
      // ONLY if variations is explicitly empty array or undefined
      if ((!product.variations || product.variations.length === 0) && product.id) {
        const baseVariation = {
          id: 'base',
          name: product.name,
          image: product.image
        };
        // Use a timeout or a ref to ensure this doesn't fire immediately in a tight loop
        onUpdate(product.id, { variations: [baseVariation], activeVariationId: 'base' });
      }

      // Sync ordered layers
      if (product.planoPaths) {
        const uniqueLayers = Array.from(new Set(product.planoPaths.map(p => p.layer))).sort();
        const savedOrder = product.planoLayerOrder || [];
        const newLayers = uniqueLayers.filter(l => !savedOrder.includes(l));
        const mergedOrder = [...savedOrder.filter(l => uniqueLayers.includes(l)), ...newLayers];
        
        // Deep comparison to prevent unnecessary state updates
        if (JSON.stringify(mergedOrder) !== JSON.stringify(orderedLayers)) {
          setOrderedLayers(mergedOrder);
        }
      }
    }
  }, [product?.id, product?.planoPaths]); // This still depends on id and paths
  const onNodesChange = (changes: NodeChange[]) => {
    setNodes((nds) => {
      const nextNodes = applyNodeChanges(changes, nds);
      onUpdate(product!.id, { operationsNodes: nextNodes });
      return nextNodes;
    });
  };

  const augmentedNodes = React.useMemo(() => {
    return nodes.map(node => ({
      ...node,
      type: 'operation',
      data: {
        ...node.data,
        onChangeLabel: (id: string, newLabel: string) => {
          setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n));
        },
        onSaveLabel: () => {
          setNodes(nds => {
            onUpdate(product!.id, { operationsNodes: nds });
            return nds;
          });
        },
        onDelete: (id: string) => {
          setNodes(nds => {
            const updatedNodes = nds.filter(n => n.id !== id);
            setEdges(eds => {
              const updatedEdges = eds.filter(e => e.source !== id && e.target !== id);
              onUpdate(product!.id, { operationsNodes: updatedNodes, operationsEdges: updatedEdges });
              return updatedEdges;
            });
            return updatedNodes;
          });
        }
      }
    }));
  }, [nodes, product?.id, onUpdate]);

  const onEdgesChange = (changes: EdgeChange[]) => {
    setEdges((eds) => {
      const nextEdges = applyEdgeChanges(changes, eds);
      onUpdate(product!.id, { operationsEdges: nextEdges });
      return nextEdges;
    });
  };

  const onEdgeClick = (_: React.MouseEvent, edge: any) => {
    if (window.confirm('¿Eliminar esta conexión?')) {
      setEdges((eds) => {
        const nextEdges = eds.filter((e) => e.id !== edge.id);
        onUpdate(product!.id, { operationsEdges: nextEdges });
        return nextEdges;
      });
    }
  };

  const onConnect = (params: Connection) => {
    setEdges((eds) => {
      const nextEdges = addEdge(params, eds);
      onUpdate(product!.id, { operationsEdges: nextEdges });
      return nextEdges;
    });
  };

  const handleAddOperation = () => {
    const newNodeId = `op-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      position: { x: 250, y: 100 },
      data: { label: `Nueva Operación` },
    };
    setNodes(nds => {
      const nextNodes = [...nds, newNode];
      onUpdate(product!.id, { operationsNodes: nextNodes });
      return nextNodes;
    });
  };

  const handleTransformEnd = (operationId: string, pieceId: string, state: { x: number, y: number, r: number, s?: number }) => {
    const currentAssemblyState = product!.assemblyState || {};
    const currentOpState = currentAssemblyState[operationId] || {};
    const newState = {
      ...currentAssemblyState,
      [operationId]: {
        ...currentOpState,
        [pieceId]: state
      }
    };
    onUpdate(product!.id, { assemblyState: newState });
  };

  const handleAutoGenerateCallouts = () => {
    if (!product?.pieces || !currentVariationId) return;

    const currentAnns = product.variationAnnotations?.[currentVariationId]?.['ayuda_visual'] || [];
    const existingMaterials = new Set(
      currentAnns
        .map(a => ((product.pieces || []) || []).find(p => p.id === a.linkedPieceId)?.material)
        .filter(Boolean)
    );

    const uniqueMaterialsInProduct = new Map<string, string>(); // material -> pieceId
    ((product.pieces || []) || []).forEach(p => {
      const mat = p.material || 'Sin material';
      if (!uniqueMaterialsInProduct.has(mat)) {
        uniqueMaterialsInProduct.set(mat, p.id);
      }
    });

    const newAnnotations: Annotation[] = [];
    let staggeredOffset = 0;

    uniqueMaterialsInProduct.forEach((pieceId, material) => {
      if (!existingMaterials.has(material)) {
        const id = `ann-${Date.now()}-${staggeredOffset}`;
        newAnnotations.push({
          id,
          type: 'arrow',
          x: 20 + (staggeredOffset * 5) % 60,
          y: 20 + (staggeredOffset * 8) % 60,
          x2: 35 + (staggeredOffset * 5) % 60,
          y2: 30 + (staggeredOffset * 8) % 60,
          r: 0,
          s: 1,
          linkedPieceId: pieceId
        });
        staggeredOffset++;
      }
    });

    if (newAnnotations.length === 0) {
      alert('Ya existen cuadros para todos los materiales de la ficha técnica.');
      return;
    }

    onUpdate(product.id, {
      variationAnnotations: {
        ...product.variationAnnotations,
        [currentVariationId]: {
          ...product.variationAnnotations?.[currentVariationId],
          ayuda_visual: [...currentAnns, ...newAnnotations]
        }
      }
    });
  };

  /**
   * Sub-component for individual annotations with real-time sync
   */
  const AnnotationItem = ({ 
    ann, 
    visualCanvasRef, 
    currentVariationId, 
    product, 
    onUpdate 
  }: { 
    ann: Annotation; 
    visualCanvasRef: React.RefObject<HTMLDivElement | null>;
    currentVariationId: string;
    product: Product;
    onUpdate: (id: string, updates: Partial<Product>) => void;
  }) => {
    const x = useMotionValue(ann.x);
    const y = useMotionValue(ann.y);
    const x2 = useMotionValue(ann.x2);
    const y2 = useMotionValue(ann.y2);

    const xPct = useTransform(x, v => `${v}%`);
    const yPct = useTransform(y, v => `${v}%`);
    const x2Pct = useTransform(x2, v => `${v}%`);
    const y2Pct = useTransform(y2, v => `${v}%`);

    const linkedPiece = ((product.pieces || []) || []).find(p => p.id === ann.linkedPieceId);

    const handleUpdateGlobal = (updates: Partial<Annotation>) => {
      const currentAnns = product.variationAnnotations?.[currentVariationId]?.['ayuda_visual'] || [];
      const updatedAnnotations = currentAnns.map(a => a.id === ann.id ? { ...a, ...updates } : a);
      onUpdate(product.id, { 
        variationAnnotations: { 
          ...product.variationAnnotations, 
          [currentVariationId]: { ...product.variationAnnotations?.[currentVariationId], ayuda_visual: updatedAnnotations } 
        } 
      });
    };

    return (
      <React.Fragment>
        {/* Real-time sync arrow */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1, pointerEvents: 'none' }}>
          <defs>
            <marker id={`arrowhead-${ann.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-color)" />
            </marker>
          </defs>
          <motion.line 
            x1={xPct} 
            y1={yPct} 
            x2={x2Pct} 
            y2={y2Pct} 
            stroke="var(--accent-color)" 
            strokeWidth="2"
            markerEnd={`url(#arrowhead-${ann.id})`}
          />
        </svg>

        {/* Draggable Label Box (Real-Time Sync) */}
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={visualCanvasRef}
          dragElastic={0}
          onDrag={(_, info) => {
            if (visualCanvasRef.current) {
              const rect = visualCanvasRef.current.getBoundingClientRect();
              x.set(((info.point.x - rect.left) / rect.width) * 100);
              y.set(((info.point.y - rect.top) / rect.height) * 100);
            }
          }}
          onDragEnd={() => {
            handleUpdateGlobal({ x: x.get(), y: y.get() });
          }}
          style={{ 
            position: 'absolute', 
            left: xPct, 
            top: yPct, 
            x: '-50%', 
            y: '-50%',
            cursor: 'move',
            zIndex: 10,
            pointerEvents: 'auto'
          }}
        >
          <div className="callout-box">
            <select 
              value={ann.linkedPieceId || ''} 
              onChange={(e) => handleUpdateGlobal({ linkedPieceId: e.target.value })}
              className="callout-select"
              title={linkedPiece ? `Componente: ${linkedPiece.name}` : 'Seleccionar pieza'}
            >
              <option value="">Seleccionar...</option>
              {((product.pieces || []) || []).map(p => (
                <option key={p.id} value={p.id}>{p.material || p.name}</option>
              ))}
            </select>
            <div className="callout-actions">
              <button 
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const currentAnns = product.variationAnnotations?.[currentVariationId]?.['ayuda_visual'] || [];
                  const updatedAnns = currentAnns.filter(a => a.id !== ann.id);
                  onUpdate(product.id, { 
                    variationAnnotations: { 
                      ...product.variationAnnotations, 
                      [currentVariationId]: { ...product.variationAnnotations?.[currentVariationId], ayuda_visual: updatedAnns } 
                    } 
                  });
                }}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
              >
                <Trash size={12} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Draggable Arrow Head (Real-Time Sync) */}
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={visualCanvasRef}
          dragElastic={0}
          onDrag={(_, info) => {
            if (visualCanvasRef.current) {
              const rect = visualCanvasRef.current.getBoundingClientRect();
              x2.set(((info.point.x - rect.left) / rect.width) * 100);
              y2.set(((info.point.y - rect.top) / rect.height) * 100);
            }
          }}
          onDragEnd={() => {
            handleUpdateGlobal({ x2: x2.get(), y2: y2.get() });
          }}
          style={{ 
            position: 'absolute', 
            left: x2Pct, 
            top: y2Pct, 
            x: '-50%', 
            y: '-50%',
            width: '28px',
            height: '28px',
            background: 'transparent',
            borderRadius: '50%',
            cursor: 'crosshair',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'auto'
          }}
        >
          <div style={{ width: '6px', height: '6px', background: 'var(--accent-color)', border: '1.5px solid white', borderRadius: '50%', boxShadow: '0 0 5px rgba(0,0,0,0.3)' }} />
        </motion.div>
      </React.Fragment>
    );
  };

  const handleAddAnnotation = (operationId: string, type: AnnotationType) => {
    if (type === 'stitching') {
      setDrawingMode('stitching');
      setTempPoints([]);
      setSelectedElementId(null);
      return;
    }

    const id = `ann-${Date.now()}`;
    const ann: Annotation = {
      id,
      type,
      x: 50,
      y: 50,
      r: 0,
      s: 1,
      text: type === 'text' ? 'Escribe aquí...' : undefined
    };

    if (type === 'arrow') {
      ann.x2 = 150;
      ann.y2 = 50;
    }

    const currentAnnotations = product?.annotations || {};
    const opAnnotations = (currentAnnotations as any)[operationId] || [];

    onUpdate(product!.id, {
      annotations: {
        ...currentAnnotations,
        [operationId]: [...opAnnotations, ann]
      }
    });

    setSelectedElementId(id);
  };

  const handleEmpalmeAdd = (nodeId: string, empalme: { mainLayer: string, secondaries: string[] }) => {
    setNodes(nds => {
      const next = nds.map(n => {
        if (n.id !== nodeId) return n;
        const current = (n.data.manualEmpalmes as any[]) || [];
        return { ...n, data: { ...n.data, manualEmpalmes: [...current, empalme] } };
      });
      onUpdate(product!.id, { operationsNodes: next });
      return next;
    });
  };

  const handleEmpalmeDelete = (nodeId: string, index: number) => {
    setNodes(nds => {
      const next = nds.map(n => {
        if (n.id !== nodeId) return n;
        const current = (n.data.manualEmpalmes as any[]) || [];
        return { ...n, data: { ...n.data, manualEmpalmes: current.filter((_, i) => i !== index) } };
      });
      onUpdate(product!.id, { operationsNodes: next });
      return next;
    });
  };

  const handleFinalizeStitch = (operationId: string) => {
    if (tempPoints.length < 2) {
      setDrawingMode('none');
      setTempPoints([]);
      return;
    }

    const base = tempPoints[0];
    const normalizedPoints = tempPoints.map(p => ({ x: p.x - base.x, y: p.y - base.y }));

    const id = `ann-${Date.now()}`;
    const ann: Annotation = {
      id,
      type: 'stitching',
      x: base.x,
      y: base.y,
      r: 0,
      s: 1,
      points: normalizedPoints
    };

    const currentAnnotations = product!.annotations || {};
    const opAnnotations = currentAnnotations[operationId] || [];
    onUpdate(product!.id, {
      annotations: {
        ...currentAnnotations,
        [operationId]: [...opAnnotations, ann]
      }
    });

    setDrawingMode('none');
    setTempPoints([]);
    setSelectedElementId(id);
  };

  const handleTransformAnnotation = (operationId: string, annId: string, state: Partial<Annotation>) => {
    const currentAnnotations = product!.annotations || {};
    const opAnnotations = currentAnnotations[operationId] || [];
    const newAnnotations = opAnnotations.map(a => a.id === annId ? { ...a, ...state } : a);
    onUpdate(product!.id, {
      annotations: {
        ...currentAnnotations,
        [operationId]: newAnnotations
      }
    });
  };

  const handleDeleteAnnotation = (operationId: string, annId: string) => {
    const currentAnnotations = product!.annotations || {};
    const opAnnotations = currentAnnotations[operationId] || [];
    const newAnnotations = opAnnotations.filter(a => a.id !== annId);
    onUpdate(product!.id, {
      annotations: {
        ...currentAnnotations,
        [operationId]: newAnnotations
      }
    });
  };

  const handleTextChangeAnnotation = (operationId: string, annId: string, text: string) => {
    const currentAnnotations = product!.annotations || {};
    const opAnnotations = currentAnnotations[operationId] || [];
    const newAnnotations = opAnnotations.map(a => a.id === annId ? { ...a, text } : a);
    onUpdate(product!.id, {
      annotations: {
        ...currentAnnotations,
        [operationId]: newAnnotations
      }
    });
  };

  const handleStitchUpdate = (nodeId: string, index: number, updates: any) => {
    const nextNodes = nodes.map(n => {
      if (n.id !== nodeId) return n;
      const currentStitches = [...(n.data.manualStitches as any[]) || []];
      if (currentStitches[index]) {
        currentStitches[index] = { ...currentStitches[index], ...updates };
      }
      return { ...n, data: { ...n.data, manualStitches: currentStitches } };
    });
    setNodes(nextNodes);
    onUpdate(product!.id, { operationsNodes: nextNodes });
  };

  const handleStitchDelete = (nodeId: string, index: number) => {
    const nextNodes = nodes.map(n => {
      if (n.id !== nodeId) return n;
      const currentStitches = [...(n.data.manualStitches as any[]) || []];
      currentStitches.splice(index, 1);
      return { ...n, data: { ...n.data, manualStitches: currentStitches } };
    });
    setNodes(nextNodes);
    setEditingStitch(null);
    onUpdate(product!.id, { operationsNodes: nextNodes });
  };

  const flatPiecesSorted = React.useMemo(() => {
    const piecesSource = product?.pieces || [];
    if (piecesSource.length === 0) return [];
    return [...piecesSource].sort((a, b) => {
      const getWeight = (p: Piece) => {
        const mat = (p.material || '').toUpperCase();
        if (mat === 'PIEL') return 1;
        if (mat === 'MALLA') return 2;
        if (mat === 'FORRO') return 3;
        if (mat.includes('ESPONJA')) return 4;
        if (mat === 'BETA') return 5;
        return 6;
      };

      const wA = getWeight(a);
      const wB = getWeight(b);

      if (wA !== wB) return wA - wB;

      const matA = (a.material || '').toUpperCase();
      const matB = (b.material || '').toUpperCase();
      if (matA !== matB) return matA.localeCompare(matB);

      const nameA = a.name.toUpperCase().trim();
      const nameB = b.name.toUpperCase().trim();

      if (nameA === 'CHINELA' && nameB !== 'CHINELA') return -1;
      if (nameB === 'CHINELA' && nameA !== 'CHINELA') return 1;

      return a.name.localeCompare(b.name);
    });
  }, [product?.pieces]);

  const materialGroups = React.useMemo(() => {
    const groups: Record<string, { totalArea: number, count: number }> = {};
    flatPiecesSorted.forEach(p => {
      const mat = p.material || 'Sin Asignar';
      if (!groups[mat]) groups[mat] = { totalArea: 0, count: 0 };
      groups[mat].totalArea += parseFloat(p.areaWaste || '0');
      groups[mat].count += 1;
    });
    return groups;
  }, [flatPiecesSorted]);

  if (!product) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('La imagen es demasiado grande. Máximo 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate(product.id, { image: reader.result as string });
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDxfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDxfError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const content = reader.result as string;
          const extractedPieces = processDxfContent(content);
          if (extractedPieces.length > 0) {
            const { updatedNodes, updatedEdges, changed } = applyAutoOperations(extractedPieces, nodes, edges);
            if (changed) {
              setNodes(updatedNodes);
              setEdges(updatedEdges);
              onUpdate(product.id, { pieces: extractedPieces, operationsNodes: updatedNodes, operationsEdges: updatedEdges });
            } else {
              onUpdate(product.id, { pieces: extractedPieces });
            }
          } else {
            setDxfError('No se encontraron bloques u Outline en el archivo DXF.');
          }
        } catch (err: any) {
          setDxfError(err.message || 'Error analizando DXF');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleXmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product?.pieces) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const xmlString = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const parserError = xmlDoc.getElementsByTagName('parsererror');
        if (parserError.length > 0) {
          alert('Error de formato en el XML: El archivo no es un XML válido.');
          return;
        }

        const sizeMap: Record<string, Record<string, any>> = {};
        const allSizes = new Set<string>();

        // Find all top-level item/ITEM elements that have a size attribute
        const outerItems = Array.from(xmlDoc.querySelectorAll('item[size], ITEM[size], item[Size], item[descsize]'));

        if (outerItems.length === 0) {
          // Fallback: search for any item and check if it has children or specific attributes manually
          const allItems = Array.from(xmlDoc.querySelectorAll('item, ITEM'));
          allItems.forEach(outer => {
            const size = outer.getAttribute('size') || outer.getAttribute('descsize') || outer.getAttribute('Size');
            if (size) {
              // This is a size container
              allSizes.add(size);
              if (!sizeMap[size]) sizeMap[size] = {};

              const innerItems = Array.from(outer.querySelectorAll('item, ITEM'));
              innerItems.forEach(inner => {
                const pieceName = inner.getAttribute('piece') || inner.getAttribute('piece_name');
                if (pieceName) {
                  const cleanName = pieceName.toUpperCase().trim();
                  const xmlMat = inner.getAttribute('group') || inner.getAttribute('material') || '';
                  const match = findMaterialMatch(xmlMat, catalogMaterials);
                  
                  sizeMap[size][cleanName] = {
                    area: inner.getAttribute('area') || '',
                    consumption: inner.getAttribute('consumption') || '',
                    quantity: inner.getAttribute('piece_piecespair') || inner.getAttribute('quantity') || 2,
                    material: match ? match.name : xmlMat,
                    materialId: match ? match.id : undefined,
                    thickness: match ? (match.thicknessMin ? `${match.thicknessMin}mm` : '') : (inner.getAttribute('material_description') || inner.getAttribute('thickness') || '')
                  };
                }
              });
            }
          });
        } else {
          outerItems.forEach(outer => {
            const size = outer.getAttribute('size') || outer.getAttribute('descsize') || outer.getAttribute('Size') || 'Estándar';
            allSizes.add(size);
            if (!sizeMap[size]) sizeMap[size] = {};

            const innerItems = Array.from(outer.querySelectorAll('item, ITEM'));
            innerItems.forEach(inner => {
              const pieceName = inner.getAttribute('piece') || inner.getAttribute('piece_name');
              if (pieceName) {
                const cleanName = pieceName.toUpperCase().trim();
                const xmlMat = inner.getAttribute('group') || inner.getAttribute('material') || '';
                const match = findMaterialMatch(xmlMat, catalogMaterials);

                sizeMap[size][cleanName] = {
                  area: inner.getAttribute('area') || '',
                  consumption: inner.getAttribute('consumption') || '',
                  quantity: inner.getAttribute('piece_piecespair') || inner.getAttribute('quantity') || 2,
                  material: match ? match.name : xmlMat,
                  materialId: match ? match.id : undefined,
                  thickness: match ? (match.thicknessMin ? `${match.thicknessMin}mm` : '') : (inner.getAttribute('material_description') || inner.getAttribute('thickness') || '')
                };
              }
            });
          });
        }

        const sizes = Array.from(allSizes).sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        });

        if (sizes.length === 0) {
          // If nested logic failed, try flat logic as last resort
          const flatItems = Array.from(xmlDoc.querySelectorAll('item, ITEM'));
          flatItems.forEach(item => {
            const pieceName = item.getAttribute('piece') || item.getAttribute('piece_name');
            const size = item.getAttribute('size') || item.getAttribute('descsize') || 'Estándar';
            if (pieceName) {
              allSizes.add(size);
              if (!sizeMap[size]) sizeMap[size] = {};
              const cleanName = pieceName.toUpperCase().trim();
              const xmlMat = item.getAttribute('group') || item.getAttribute('material') || '';
              const match = findMaterialMatch(xmlMat, catalogMaterials);
              sizeMap[size][cleanName] = {
                area: item.getAttribute('area') || '',
                consumption: item.getAttribute('consumption') || '',
                quantity: item.getAttribute('piece_piecespair') || item.getAttribute('quantity') || 2,
                material: match ? match.name : xmlMat,
                materialId: match ? match.id : undefined,
                thickness: match ? (match.thicknessMin ? `${match.thicknessMin}mm` : '') : (item.getAttribute('material_description') || item.getAttribute('thickness') || '')
              };
            }
          });
          sizes.push(...Array.from(allSizes).sort((a, b) => {
            const numA = parseFloat(a);
            const numB = parseFloat(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
          }));
        }

        if (sizes.length === 0) {
          alert('No se pudieron extraer tallas ni piezas del XML. Verifica el formato del archivo.');
          return;
        }

        const mainSize = sizes.includes('27') ? '27' : sizes[0];
        setSelectedFichaSize(mainSize);

        let updatedCount = 0;
        const updatedPieces = ((product.pieces || []) || []).map(p => {
          const cleanName = p.name.toUpperCase().trim();
          const pSizeData: Record<string, any> = {};

          sizes.forEach(sz => {
            const data = sizeMap[sz]?.[cleanName];
            if (data) {
                pSizeData[sz] = {
                  area: formatDecimal(data.area),
                  areaWaste: formatDecimal(data.consumption),
                  quantity: data.quantity,
                  material: data.material,
                  materialId: data.materialId,
                  thickness: formatDecimal(data.thickness)
                };
            }
          });

          const mainData = sizeMap[mainSize]?.[cleanName];
          if (mainData) {
            updatedCount++;
            return {
              ...p,
              area: formatDecimal(mainData.area),
              areaWaste: formatDecimal(mainData.consumption),
              quantity: mainData.quantity,
              material: mainData.material || p.material,
              materialId: mainData.materialId || p.materialId,
              thickness: formatDecimal(mainData.thickness) || p.thickness,
              sizeData: pSizeData
            };
          }
          return { ...p, sizeData: pSizeData };
        });

        const { updatedNodes, updatedEdges, changed } = applyAutoOperations(updatedPieces, nodes, edges);
        const updates: Partial<Product> = { pieces: updatedPieces, sizes };
        if (changed) {
          setNodes(updatedNodes);
          setEdges(updatedEdges);
          updates.operationsNodes = updatedNodes;
          updates.operationsEdges = updatedEdges;
        }
        onUpdate(product.id, updates);

        if (updatedCount === 0) {
          alert('XML procesado, pero los nombres de las piezas no coinciden con las del proyecto (DXF). Se han cargado las tallas pero los consumos podrían estar vacíos.');
        }
      } catch (err: any) {
        alert('Error parsing XML: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePlanoDxfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !product) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const { paths, viewBox } = processFullDxfContent(content);
        onUpdate(product.id, { planoPaths: paths, planoViewBox: viewBox });
      } catch (err) {
        // Error already handled in processFullDxfContent or just alert
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const toggleLayer = (layerName: string) => {
    const next = new Set(hiddenLayers);
    if (next.has(layerName)) next.delete(layerName);
    else next.add(layerName);
    setHiddenLayers(next);
  };

  const isolateLayer = (layerName: string) => {
    const allLayers = Array.from(new Set(product?.planoPaths?.map(p => p.layer) || []));
    setHiddenLayers(new Set(allLayers.filter(l => l !== layerName)));
  };

  const showAllLayers = () => {
    setHiddenLayers(new Set());
  };

  const handleReorderLayers = (newOrder: string[]) => {
    setOrderedLayers(newOrder);
    onUpdate(product!.id, { planoLayerOrder: newOrder });
  };

  const handlePlanoWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setPlanoScale(prev => Math.min(Math.max(prev * delta, 0.1), 10));
  };

  const handlePlanoMouseInteractions = (e: React.MouseEvent) => {
    if (isMeasuring) {
      const svg = e.currentTarget.querySelector('svg');
      if (!svg) return;

      const coords = getSvgCoords(e, svg);

      if (e.type === 'mousedown') {
        if (!measureStart) {
          setMeasureStart(coords);
          setMeasureEnd(coords);
        } else {
          // Second click - save it!
          setSavedMeasurements(prev => [...prev, {
            start: measureStart,
            end: coords,
            id: `measure-${Date.now()}`
          }]);
          setMeasureStart(null);
          setMeasureEnd(null);
        }
      } else if (e.type === 'mousemove') {
        if (measureStart) {
          setMeasureEnd(coords);
        }
      }
      return;
    }

    // Direct Interaction (Rotate / Pan)
    if (e.type === 'mousedown') {
      const isPan = e.shiftKey || e.button === 1;
      if (isPan) {
        setIsDraggingPlano('pan');
      } else if (is3D) {
        setIsDraggingPlano('rotate');
      } else {
        return; // Normal 2D behavior (maybe select elements?)
      }

      setDragStartPos({ x: e.clientX, y: e.clientY });
      setStartRotation({ x: rotateX, y: rotateY });
      setStartPan({ x: planoPan.x, y: planoPan.y });
    } else if (e.type === 'mousemove' && isDraggingPlano !== 'none') {
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;

      if (isDraggingPlano === 'rotate') {
        setRotateY(startRotation.y + dx * 0.5);
        setRotateX(Math.max(-90, Math.min(90, startRotation.x - dy * 0.5)));
      } else if (isDraggingPlano === 'pan') {
        setPlanoPan({
          x: startPan.x + dx,
          y: startPan.y + dy
        });
      }
    } else if (e.type === 'mouseup' || e.type === 'mouseleave') {
      setIsDraggingPlano('none');
    }
  };

  const handleOperationWheel = (nodeId: string, e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setNodes(nds => nds.map(n => {
      if (n.id !== nodeId) return n;
      const currentScale = (n.data.viewState as any)?.scale || 1;
      const nextScale = Math.min(Math.max(currentScale * delta, 0.1), 10);
      return { ...n, data: { ...n.data, viewState: { ...((n.data.viewState as any) || {}), scale: nextScale } } };
    }));
  };

  const handleOperationMouseInteractions = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const viewState = (node.data.viewState as any) || { rotateX: -20, rotateY: 20, scale: 1, pan: { x: 0, y: 0 }, explosion: 30 };

    if (e.type === 'mousedown') {
      const isPan = e.shiftKey || e.button === 1;
      setIsDraggingPlano(isPan ? 'pan' : 'rotate');
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setStartRotation({ x: viewState.rotateX, y: viewState.rotateY });
      setStartPan({ x: viewState.pan.x, y: viewState.pan.y });
    } else if (e.type === 'mousemove' && isDraggingPlano !== 'none') {
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;

      setNodes(nds => nds.map(n => {
        if (n.id !== nodeId) return n;
        const currentViewState = (n.data.viewState as any) || viewState;
        let nextViewState = { ...currentViewState };

        if (isDraggingPlano === 'rotate') {
          nextViewState.rotateY = startRotation.y + dx * 0.5;
          nextViewState.rotateX = Math.max(-90, Math.min(90, startRotation.x - dy * 0.5));
        } else if (isDraggingPlano === 'pan') {
          nextViewState.pan = {
            x: startPan.x + dx,
            y: startPan.y + dy
          };
        }
        return { ...n, data: { ...n.data, viewState: nextViewState } };
      }));
      setIsDraggingPlano('none');
    }
  };

  const handlePieceUpdate = (pieceId: string, pieceUpdates: Partial<Piece>, size?: string) => {
    if (!product) return;

    const formattedUpdates = { ...pieceUpdates };
    if (formattedUpdates.thickness !== undefined) formattedUpdates.thickness = formatDecimal(formattedUpdates.thickness);
    if (formattedUpdates.area !== undefined) formattedUpdates.area = formatDecimal(formattedUpdates.area);
    if (formattedUpdates.areaWaste !== undefined) formattedUpdates.areaWaste = formatDecimal(formattedUpdates.areaWaste);

    const isMaterialUpdate = formattedUpdates.material !== undefined || formattedUpdates.materialId !== undefined;

    // 1. Check if it's an extra technical row (documentation only)
    if (pieceId.startsWith('extra-')) {
      const updatedVariations = (product.variations || []).map(v => {
        if (v.id !== currentVariationId) return v;
        return {
          ...v,
          extraTechnicalRows: (v.extraTechnicalRows || []).map(p => {
            if (p.id !== pieceId) return p;
            const newPiece = { ...p, ...formattedUpdates };
            if (isMaterialUpdate && p.sizeData) {
              const newSizeData = { ...p.sizeData };
              Object.keys(newSizeData).forEach(sz => {
                newSizeData[sz] = {
                  ...newSizeData[sz],
                  material: formattedUpdates.material ?? newSizeData[sz].material,
                  materialId: formattedUpdates.materialId ?? newSizeData[sz].materialId
                };
              });
              newPiece.sizeData = newSizeData;
            } else if (size) {
              newPiece.sizeData = { ...p.sizeData, [size]: { ...p.sizeData?.[size], ...formattedUpdates } };
            }
            return newPiece;
          })
        };
      });
      onUpdate(product.id, { variations: updatedVariations });
      return;
    }

    // 2. Base pieces update
    if (!(product.pieces || [])) return;
    const updatedPieces = ((product.pieces || []) || []).map(p => {
      if (p.id !== pieceId) return p;
      const newPiece = { ...p, ...formattedUpdates };
      if (isMaterialUpdate && p.sizeData) {
        const newSizeData = { ...p.sizeData };
        Object.keys(newSizeData).forEach(sz => {
          newSizeData[sz] = {
            ...newSizeData[sz],
            material: formattedUpdates.material ?? newSizeData[sz].material,
            materialId: formattedUpdates.materialId ?? newSizeData[sz].materialId
          };
        });
        newPiece.sizeData = newSizeData;
      } else if (size) {
        newPiece.sizeData = { ...p.sizeData, [size]: { ...p.sizeData?.[size], ...formattedUpdates } };
      }
      return newPiece;
    });

    const { updatedNodes, updatedEdges, changed } = applyAutoOperations(updatedPieces, nodes, edges);
    const updates: Partial<Product> = { pieces: updatedPieces };
    if (changed) {
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      updates.operationsNodes = updatedNodes;
      updates.operationsEdges = updatedEdges;
    }
    onUpdate(product.id, updates);
  };

  const handleDeletePiece = (pieceId: string) => {
    if (!product) return;
    if (pieceId.startsWith('extra-')) {
      const updatedVariations = (product.variations || []).map(v => 
        v.id === currentVariationId 
          ? { ...v, extraTechnicalRows: (v.extraTechnicalRows || []).filter(p => p.id !== pieceId) }
          : v
      );
      onUpdate(product.id, { variations: updatedVariations });
      return;
    }
    if (!(product.pieces || [])) return;
    const updatedPieces = ((product.pieces || []) || []).filter(p => p.id !== pieceId);
    onUpdate(product.id, { pieces: updatedPieces });
  };

  const handleUpdateVisualSpecs = (newSpecs: Partial<VisualSpecs>) => {
    if (!product) return;
    const updatedVariations = (product.variations || []).map(v => 
      v.id === currentVariationId 
        ? { ...v, visualSpecs: { ...(v.visualSpecs || {}), ...newSpecs } }
        : v
    );
    onUpdate(product.id, { variations: updatedVariations });
  };

  const exportToPdf = async () => {
    if (!product || flatPiecesSorted.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(`Ficha Técnica: ${product.name}`, 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`ID Producto: ${product.id}`, 14, 30);
    doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 14, 36);
    const mergedPieces = [
      ...((product.pieces || []) || []),
      ...(currentVariation?.extraTechnicalRows || [])
    ];

    doc.text(`Total Componentes: ${mergedPieces.length}`, 14, 42);

    const preRenderedData: Record<string, string> = {};
    for (const piece of mergedPieces) {
      if (piece.svgPath) {
        preRenderedData[piece.id] = await svgToPngDataUrl(piece, stringToColor(piece.material || 'Sin Asignar'));
      }
    }

    const tableBody = mergedPieces.map(p => [
      p.svgPath ? '' : 'DATO',
      p.name,
      p.material || 'Sin Asignar',
      p.quantity?.toString() || '2'
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Gráfico', 'Nombre de Componente', 'Grupo', 'Cat / Par']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], fontSize: 11 },
      styles: { fontSize: 10, cellPadding: 4, minCellHeight: 20, valign: 'middle' },
      columnStyles: { 0: { cellWidth: 25, halign: 'center' } },
      margin: { left: 14 },
      didDrawCell: (data) => {
        if (data.column.index === 0 && data.cell.section === 'body') {
          const pieceId = mergedPieces[data.row.index].id;
          const imgData = preRenderedData[pieceId];
          if (imgData) {
            const margin = 2;
            const size = data.cell.height - margin * 2;
            doc.addImage(imgData, 'PNG', data.cell.x + (data.cell.width - size) / 2, data.cell.y + margin, size, size);
          }
        }
      }
    });

    doc.save(`${product.name.replace(/\s+/g, '_')}_Consumo.pdf`);
  };


  const exportToExcel = () => {
    if (!product || flatPiecesSorted.length === 0) return;

    const workbook = XLSX.utils.book_new();
    const targetSizes = (product.sizes && product.sizes.length > 0) ? product.sizes : ['Estándar'];

    targetSizes.forEach(sz => {
      const mergedPieces = [
        ...((product.pieces || []) || []),
        ...(currentVariation?.extraTechnicalRows || [])
      ].sort((a,b) => a.name.localeCompare(b.name));

      const currentPieces = mergedPieces.map(p => {
        const sData = p.sizeData?.[sz];
        return {
          ...p,
          area: sData?.area || '',
          areaWaste: sData?.areaWaste || '',
          quantity: sData?.quantity || p.quantity || 2,
          material: sData?.material || p.material || 'Sin Asignar',
          thickness: sData?.thickness || p.thickness || ''
        };
      });

      const currentMatGroups: Record<string, { totalArea: number, count: number }> = {};
      currentPieces.forEach(p => {
        const mat = p.material || 'Sin Asignar';
        if (!currentMatGroups[mat]) currentMatGroups[mat] = { totalArea: 0, count: 0 };
        currentMatGroups[mat].count++;
        const areaVal = parseFloat((p.areaWaste || '0').replace(',', '.'));
        if (!isNaN(areaVal)) currentMatGroups[mat].totalArea += areaVal;
      });

      const data = currentPieces.map(p => ({
        'Nombre del Componente': p.name.toUpperCase(),
        'Material': (p.material || 'Sin Asignar').toUpperCase(),
        'Pzas / Par': p.quantity,
        'Espesor en mm': formatDecimal(p.thickness),
        'Area': formatDecimal(p.area),
        'Area + Desperdicio': formatDecimal(p.areaWaste),
        'Consumo Total Mat.': formatDecimal(currentMatGroups[p.material || 'Sin Asignar'].totalArea)
      }));

      const worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.sheet_add_json(worksheet, data, { origin: "A3" });

      // Add Title and metadata
      XLSX.utils.sheet_add_aoa(worksheet, [
        [`PRODUCTO: ${product.name.toUpperCase()}`],
        [`TALLA: ${sz}`, ``, ``, `FECHA: ${new Date().toLocaleDateString()}`]
      ], { origin: "A1" });

      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:G100');

      // Define common styles
      const headerStyle = {
        fill: { fgColor: { rgb: "6366F1" } }, // Indigo
        font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      const titleStyle = {
        font: { bold: true, sz: 14, color: { rgb: "1E1B4B" } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };

      const cellStyle = {
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }
        }
      };

      const nameStyle = {
        ...cellStyle,
        alignment: { horizontal: 'left', vertical: 'center' }
      };

      // Apply styles to all cells in the range
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_ref = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cell_ref]) continue;

          // Title row
          if (R === 0) {
            worksheet[cell_ref].s = titleStyle;
          }
          // Metadata row
          else if (R === 1) {
            worksheet[cell_ref].s = { font: { italic: true }, alignment: { horizontal: 'left' } };
          }
          // Header row (row 3 is index 2)
          else if (R === 2) {
            worksheet[cell_ref].s = headerStyle;
          }
          // Data rows
          else {
            if (C === 0 || C === 1) {
              worksheet[cell_ref].s = nameStyle;
            } else {
              worksheet[cell_ref].s = cellStyle;
            }
          }
        }
      }

      const merges: any[] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }
      ];

      let currentRow = 3;
      const matOrder = Array.from(new Set(currentPieces.map(p => p.material || 'Sin Asignar')));

      matOrder.forEach(mat => {
        const g = currentMatGroups[mat];
        if (g.count > 1) {
          merges.push({
            s: { r: currentRow, c: 6 },
            e: { r: currentRow + g.count - 1, c: 6 }
          });
          // Ensure styles for merged cells in col 6
          for (let rowIdx = currentRow; rowIdx < currentRow + g.count; rowIdx++) {
            const cell_ref = XLSX.utils.encode_cell({ r: rowIdx, c: 6 });
            if (worksheet[cell_ref]) worksheet[cell_ref].s = cellStyle;
          }
        }
        currentRow += g.count;
      });

      worksheet['!merges'] = merges;
      worksheet['!cols'] = [
        { wch: 35 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 20 }
      ];
      worksheet['!autofilter'] = { ref: `A3:G${3 + currentPieces.length}` };

      XLSX.utils.book_append_sheet(workbook, worksheet, `Talla ${sz}`);
    });

    XLSX.writeFile(workbook, `${product.name.replace(/\s+/g, '_')}_Ficha_Tecnica.xlsx`);
  };

  const exportFichaToPdf = async () => {
    if (!product || flatPiecesSorted.length === 0) return;

    const doc = new jsPDF();
    const targetSizes = (product.sizes && product.sizes.length > 0) ? product.sizes : ['Estándar'];

    for (let i = 0; i < targetSizes.length; i++) {
      const sz = targetSizes[i];
      if (i > 0) doc.addPage();

      if (product.image) {
        try {
          const imgProps = doc.getImageProperties(product.image);
          const maxWidth = 45;
          const maxHeight = 35;
          const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
          const finalWidth = imgProps.width * ratio;
          const finalHeight = imgProps.height * ratio;
          const format = product.image.includes('png') ? 'PNG' : 'JPEG';
          doc.addImage(product.image, format, 150 + (maxWidth - finalWidth) / 2, 10 + (maxHeight - finalHeight) / 2, finalWidth, finalHeight);
        } catch (e) {
          console.warn("Error al incluir imagen en PDF:", e);
        }
      }

      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text(`FICHA TÉCNICA: ${product.name.toUpperCase()}`, 14, 18);

      doc.setFontSize(11);
      doc.setTextColor(200, 0, 0);
      doc.text(`TALLA: ${sz}`, 14, 25);

      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`ID PRODUCTO: ${product.id.split('-')[0].toUpperCase()}`, 14, 32);
      doc.text(`FECHA EMISIÓN: ${new Date(product.createdAt).toLocaleDateString().toUpperCase()}`, 14, 37);
      const mergedPieces = [
        ...((product.pieces || []) || []),
        ...(currentVariation?.extraTechnicalRows || [])
      ].sort((a,b) => a.name.localeCompare(b.name));

      doc.text(`TOTAL COMPONENTES: ${mergedPieces.length}`, 14, 42);

      const currentSizePieces = mergedPieces.map(p => {
        const sData = p.sizeData?.[sz];
        return {
          ...p,
          area: sData?.area || '',
          areaWaste: sData?.areaWaste || '',
          quantity: sData?.quantity || p.quantity || 2,
          material: sData?.material || p.material || 'Sin Asignar',
          thickness: sData?.thickness || p.thickness || ''
        };
      });

      const currentMatGroups: Record<string, { totalArea: number, count: number }> = {};
      currentSizePieces.forEach(p => {
        const mat = p.material || 'Sin Asignar';
        if (!currentMatGroups[mat]) currentMatGroups[mat] = { totalArea: 0, count: 0 };
        currentMatGroups[mat].count++;
        const areaVal = parseFloat((p.areaWaste || '0').replace(',', '.'));
        if (!isNaN(areaVal)) currentMatGroups[mat].totalArea += areaVal;
      });

      const tableBody: any[] = [];
      const matOrder = Array.from(new Set(currentSizePieces.map(p => p.material || 'Sin Asignar')));

      matOrder.forEach(mat => {
        const g = currentMatGroups[mat];
        const piecesInGroup = currentSizePieces.filter(p => (p.material || 'Sin Asignar') === mat);

        piecesInGroup.forEach((p, idx) => {
          const row: any[] = [
            p.name.toUpperCase(),
            (p.material || 'SIN ASIGNAR').toUpperCase(),
            (p.quantity || 2).toString(),
            formatDecimal(p.thickness),
            formatDecimal(p.area),
            formatDecimal(p.areaWaste)
          ];

          if (idx === 0) {
            row.push({
              content: formatDecimal(g.totalArea),
              rowSpan: g.count,
              styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' }
            });
          }
          tableBody.push(row);
        });
      });

      autoTable(doc, {
        startY: 48,
        head: [['NOMBRE DE COMPONENTE', 'MATERIAL', 'PZAS / PAR', 'ESPESOR (MM)', 'AREA', 'AREA + DESP.', 'CONSUMO TOTAL']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [51, 51, 51], fontSize: 7, cellPadding: 2 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14 }
      });

      // 2. Add ENSUELADO table to PDF
      const lastY = (doc as any).lastAutoTable?.finalY || 150;
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('DETALLE DE ENSUELADO', 14, lastY + 10);

      const ensueladoRows = [
        ['SUELA', (getPositionTranslation(product.name, 2, 1, nomenclature) || currentVariation.visualSpecs?.suela || 'N/A').toUpperCase()],
        ['COLOR SUELA', (getPositionTranslation(product.name, 2, 2, nomenclature) || currentVariation.visualSpecs?.colorSuela || 'N/A').toUpperCase()],
        ['AGUJETA', (currentVariation.visualSpecs?.agujeta || 'NINGUNO').toUpperCase()],
        ['PLANTILLA', (currentVariation.visualSpecs?.plantilla || 'NINGUNO').toUpperCase()],
        ['GANCHOS', (currentVariation.visualSpecs?.ganchos || 'NINGUNO').toUpperCase()]
      ];

      autoTable(doc, {
        startY: lastY + 13,
        body: ensueladoRows,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 50 } },
        margin: { left: 14 }
      });
    }

    doc.save(`${product.name.replace(/\s+/g, '_')}_Ficha_Tecnica.pdf`);
  };

  const exportSuajesToPdf = async (pieceIds: string[]) => {
    if (!product || pieceIds.length === 0) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = 215.9; // Letter width in mm
    const pageHeight = 279.4; // Letter height in mm
    const margin = 15;

    for (let i = 0; i < pieceIds.length; i++) {
      const piece = ((product.pieces || []) || []).find(p => p.id === pieceIds[i]);
      if (!piece) continue;

      if (i > 0) doc.addPage();

      // 1. Header
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`FOLIO: EDD-${product.id.split('-')[0]}`, margin, margin);
      doc.text(`FECHA: ${new Date().toLocaleDateString()}`, margin, margin + 4);

      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(product.name.toUpperCase(), pageWidth / 2, margin + 4, { align: 'center' });
      // Branding Logo instead of Text
      const logoW = 15; // Width in mm
      const logoH = 9;  // Height in mm (adjusted aspect ratio)
      doc.addImage(LOGO_SVG_BASE64, 'SVG', pageWidth - margin - logoW, margin - 4, logoW, logoH);

      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 10, pageWidth - margin, margin + 10);

      // 2. Body (Piece SVG)
      const imgData = await suajeToPngDataUrl(piece);
      if (imgData) {
        const availableHeight = 180;
        const availableWidth = pageWidth - margin * 2;
        doc.addImage(imgData, 'PNG', margin, margin + 20, availableWidth, availableHeight, undefined, 'FAST');
      }

      // 3. Footer
      const footerY = pageHeight - margin - 30;
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'bold');

      // Grid simulation
      const colWidth = (pageWidth - margin * 2) / 3;
      const rowHeight = 10;

      const drawInfo = (label: string, value: string, x: number, y: number) => {
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(label.toUpperCase(), x, y);
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(value.toUpperCase(), x, y + 4);
      };

      drawInfo('Tallas', '22 - 31', margin, footerY);
      drawInfo('Fecha', new Date().toLocaleDateString(), margin + colWidth, footerY);
      drawInfo('Nombre del Modelo', product.name, margin + colWidth * 2, footerY);

      const defaultSuajeType = (piece.quantity === 4) ? 'FLEJE de 19mm - 2 Filos' : 'FLEJE de 19mm - 1 Filo';
      const currentSuajeType = piece.suajeType || defaultSuajeType;

      drawInfo('Nombre de la Pieza', piece.name, margin, footerY + rowHeight + 2);
      drawInfo('Tipo de Suaje', currentSuajeType, margin + colWidth, footerY + rowHeight + 2);
      drawInfo('Color de Suaje', getClosestSuajeColorName(product.suajeColor || '#1e293b'), margin + colWidth * 2, footerY + rowHeight + 2);
    }

    doc.save(`${product.name.replace(/\s+/g, '_')}_Suajes.pdf`);
    setShowSuajeExportModal(false);
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay details-overlay">
        <motion.div
          className="details-modal-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="details-header">
            <div className="details-header-title">
              <h2>{product.name}</h2>
              <span className="details-id">ID: {product.id.split('-')[0]}</span>
            </div>
            <button className="close-button" onClick={onClose} aria-label="Cerrar detalles">
              <X size={28} />
            </button>
          </div>

          <div className="tabs-container">
            <div className="tabs-header">
              <button className={`tab-button ${activeTab === 'portada' ? 'active' : ''}`} onClick={() => setActiveTab('portada')}>Portada</button>
              <button className={`tab-button ${activeTab === 'ayuda_visual' ? 'active' : ''}`} onClick={() => setActiveTab('ayuda_visual')}>Ayuda Visual</button>
              <button className={`tab-button ${activeTab === 'informacion' ? 'active' : ''}`} onClick={() => setActiveTab('informacion')}>Componentes</button>
              <button className={`tab-button ${activeTab === 'plano' ? 'active' : ''}`} onClick={() => setActiveTab('plano')}>Plano</button>
              <button className={`tab-button ${activeTab === 'ficha_tecnica' ? 'active' : ''}`} onClick={() => setActiveTab('ficha_tecnica')}>Ficha Técnica</button>
              <button className={`tab-button ${activeTab === 'suajes' ? 'active' : ''}`} onClick={() => {
                setActiveTab('suajes');
                if (!selectedSuajePieceId && product?.pieces && (product.pieces || []).length > 0) {
                  setSelectedSuajePieceId((product.pieces || [])[0].id);
                }
              }}>Suajes</button>
              <button className={`tab-button ${activeTab === 'ajustes' ? 'active' : ''}`} onClick={() => setActiveTab('ajustes')}>Operaciones</button>
              {nodes.map((node, idx) => (
                <button
                  key={node.id || `op-${idx}`}
                  className={`tab-button ${activeTab === node.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(node.id)}
                  onDoubleClick={() => {
                    const newName = prompt('Nombrar operación:', node.data.label as string);
                    if (newName) {
                      setNodes(nds => {
                        const nextNodes = nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, label: newName } } : n);
                        onUpdate(product!.id, { operationsNodes: nextNodes });
                        return nextNodes;
                      });
                    }
                  }}
                >
                  {node.data.label}
                </button>
              ))}
            </div>

            <div className="tab-content">
              {activeTab === 'portada' && product && (
                <div className="portada-tab-layout">
                  {/* Vertical Sidebar */}
                  <div className="related-models-sidebar">
                    <div className="sidebar-header">
                      <h3>MODELOS RELACIONADOS</h3>
                    </div>
                    <div className="variations-list">
                      {(product!.variations || []).map((variation, vIdx) => (
                        <motion.div
                          key={variation.id || `var-${vIdx}`}
                          className={`variation-item ${currentVariationId === variation.id ? 'active' : ''}`}
                          onClick={() => setCurrentVariationId(variation.id)}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="variation-thumb">
                            <img src={variation.image} alt={variation.name} />
                          </div>
                          <div className="variation-info">
                            <span className="variation-name">{variation.name}</span>
                          </div>
                        </motion.div>
                      ))}
                      <button 
                        className="add-variation-btn"
                        onClick={() => {
                          const name = prompt('Nombre de la nueva variación:', `${product.name} (Nueva)`);
                          if (name) {
                            const newVariation = {
                              id: `var-${Date.now()}`,
                              name: name,
                              image: product.image // Starts with base image
                            };
                            const updatedVariations = [...(product.variations || []), newVariation];
                            onUpdate(product.id, { variations: updatedVariations });
                          }
                        }}
                      >
                        <Plus size={18} />
                        Agregar Variación
                      </button>
                    </div>
                  </div>

                  {/* Main Full-Screen Display */}
                  <div className="main-cover-display">
                    {(() => {
                      const currentVariation = product.variations?.find(v => v.id === currentVariationId);
                      const displayImage = currentVariation?.image || product.image;
                      
                      return (
                        <div className="full-bleed-container">
                          <img 
                            key={currentVariationId}
                            src={displayImage} 
                            alt={currentVariation?.name || product.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                          <div className="cover-overlay-actions">
                            <motion.button 
                              className="edit-cover-btn"
                              onClick={() => fileInputRef.current?.click()}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Editar imagen de este modelo"
                            >
                              <Camera size={24} />
                            </motion.button>
                          </div>
                          <div className="cover-title-overlay">
                            <h2>{currentVariation?.name || product.name}</h2>
                          </div>
                        </div>
                      );
                    })()}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64String = reader.result as string;
                            if (currentVariationId === 'base') {
                              // Update base product image too
                              onUpdate(product.id, { 
                                image: base64String,
                                variations: product.variations?.map(v => 
                                  v.id === 'base' ? { ...v, image: base64String } : v
                                )
                              });
                            } else {
                              onUpdate(product.id, {
                                variations: product.variations?.map(v => 
                                  v.id === currentVariationId ? { ...v, image: base64String } : v
                                )
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                      accept="image/jpeg, image/png, image/webp" 
                      style={{ display: 'none' }} 
                    />
                    {error && <span className="error-message-overlay">{error}</span>}
                  </div>
                </div>
              )}

              {activeTab === 'ayuda_visual' && product && (
                <div className="ayuda-visual-tab">
                  <div className="visual-aid-sheet">
                    <div className="sheet-header">
                      <Logo />
                      <div className="sheet-title">
                        <h1>AYUDA VISUAL DE PRODUCCIÓN</h1>
                        <span>MODELO: {product.name.toUpperCase()}</span>
                      </div>
                      <button className="cta-button no-print" onClick={() => window.print()}>
                        <FileDown size={18} />
                        Imprimir / Exportar
                      </button>
                    </div>

                    <div className="visual-aid-canvas-container" style={{ width: '100%' }}>
                      <div 
                        ref={visualCanvasRef}
                        className="visual-aid-canvas" 
                        style={{ 
                          position: 'relative', 
                          width: '100%', 
                          height: '900px', 
                          background: '#040404', 
                          overflow: 'hidden', 
                          borderRadius: '12px',
                          border: '2px solid #1e293b'
                        }}
                      >
                        {(() => {
                          const currentVariation = product.variations?.find(v => v.id === currentVariationId);
                          const displayImage = currentVariation?.image || product.image;
                          return (
                            <img 
                              src={displayImage} 
                              alt="Visual Aid" 
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          );
                        })()}

                        {/* Annotations Layer (Real-Time Synchronized) */}
                        <div className="annotations-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                          {(product.variationAnnotations?.[currentVariationId]?.['ayuda_visual'] || []).map((ann) => (
                            <AnnotationItem 
                              key={ann.id} 
                              ann={ann} 
                              visualCanvasRef={visualCanvasRef} 
                              currentVariationId={currentVariationId} 
                              product={product} 
                              onUpdate={onUpdate} 
                            />
                          ))}
                        </div>
                      </div>

                      <div className="ayuda-visual-toolbar no-print" style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 20, display: 'flex', gap: '0.75rem' }}>
                        <button 
                          className="add-callout-btn"
                          style={{ position: 'static' }}
                          onClick={() => {
                            const newAnn = {
                              id: `callout-${Date.now()}`,
                              type: 'arrow' as const,
                              x: 50,
                              y: 50,
                              x2: 60,
                              y2: 60,
                              r: 0
                            };
                            const currentAnns = product.variationAnnotations?.[currentVariationId]?.['ayuda_visual'] || [];
                            onUpdate(product.id, { 
                              variationAnnotations: { 
                                ...product.variationAnnotations, 
                                [currentVariationId]: { ...product.variationAnnotations?.[currentVariationId], ayuda_visual: [...currentAnns, newAnn] } 
                              } 
                            });
                          }}
                        >
                          <Plus size={18} /> Agregar Callout
                        </button>

                        <button 
                          className="add-callout-btn"
                          style={{ position: 'static', background: 'var(--accent-color)' }}
                          onClick={handleAutoGenerateCallouts}
                        >
                          <Wand2 size={18} /> Generar desde Ficha Técnica
                        </button>
                      </div>
                    </div>

                    <div className="visual-specs-section">
                      <div className="specs-grid">
                        {(() => {
                          const specs = product.variationSpecs?.[currentVariationId] || {};
                          const updateSpec = (field: string, val: string) => {
                            onUpdate(product.id, {
                              variationSpecs: {
                                ...product.variationSpecs,
                                [currentVariationId]: { ...specs, [field]: val }
                              }
                            });
                          };

                          return (
                            <>
                              <div className="spec-item">
                                <label>MATERIALES PRINCIPALES</label>
                                <input type="text" value={specs.materialResumen || ''} onChange={(e) => updateSpec('materialResumen', e.target.value)} placeholder="Ej. Piel Nappa / Malla..." />
                              </div>
                              <div className="spec-item">
                                <label>TIPO DE AGUJETA</label>
                                <input type="text" value={specs.agujeta || ''} onChange={(e) => updateSpec('agujeta', e.target.value)} placeholder="Ej. Redonda 120cm..." />
                              </div>
                              <div className="spec-item">
                                <label>TIPO DE SUELA</label>
                                <input type="text" value={specs.suela || ''} onChange={(e) => updateSpec('suela', e.target.value)} placeholder="Ej. TR Bidensidad..." />
                              </div>
                              <div className="spec-item">
                                <label>PISO DE SUELA</label>
                                <input type="text" value={specs.pisoSuela || ''} onChange={(e) => updateSpec('pisoSuela', e.target.value)} placeholder="Ej. Antiderrapante..." />
                              </div>
                              <div className="spec-item">
                                <label>TIPO DE PROTECCIÓN</label>
                                <input type="text" value={specs.proteccion || ''} onChange={(e) => updateSpec('proteccion', e.target.value)} placeholder="Ej. Casquillo Policarbonato..." />
                              </div>
                              <div className="spec-item">
                                <label>PLANTILLA</label>
                                <input type="text" value={specs.plantilla || ''} onChange={(e) => updateSpec('plantilla', e.target.value)} placeholder="Ej. Memory Foam..." />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="specs-notes">
                        <label>NOTAS Y OBSERVACIONES</label>
                        <textarea 
                          value={product.variationSpecs?.[currentVariationId]?.notas || ''} 
                          onChange={(e) => {
                            const specs = product.variationSpecs?.[currentVariationId] || {};
                            onUpdate(product.id, {
                              variationSpecs: {
                                ...product.variationSpecs,
                                [currentVariationId]: { ...specs, notas: e.target.value }
                              }
                            });
                          }} 
                          placeholder="Ingresa notas adicionales aquí..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'informacion' && (
                <div className="informacion-tab">
                  <div className="dxf-upload-section">
                    <div className="dxf-actions-row">
                      <button className="cta-button" onClick={() => dxfInputRef.current?.click()}><Upload size={18} />Cargar Archivo DXF</button>
                      {((product.pieces || []) || []) && (product.pieces || []).length > 0 && (
                        <button className="cancel-button" onClick={exportToPdf} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileDown size={18} />Exportar Ficha PDF</button>
                      )}
                    </div>
                    <input type="file" ref={dxfInputRef} onChange={handleDxfUpload} accept=".dxf" style={{ display: 'none' }} />
                    {dxfError && <span className="error-message" style={{ marginTop: '1rem' }}>{dxfError}</span>}
                  </div>
                  {((product.pieces || []) || []) && (product.pieces || []).length > 0 ? (
                    <div className="pieces-grid">
                      {flatPiecesSorted.map((piece) => {
                        const materialColor = stringToColor(piece.material || 'Sin Asignar');
                        return (
                          <motion.div className="piece-card glass-panel" key={piece.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ '--piece-color': materialColor } as React.CSSProperties}>
                            <button className="delete-piece-btn" onClick={() => handleDeletePiece(piece.id)}><Trash2 size={14} /></button>
                            <div className="piece-svg-container" onClick={() => setFullscreenPiece(piece)} style={{ cursor: 'pointer' }}>
                              <svg viewBox={piece.viewBox} className="piece-svg" preserveAspectRatio="xMidYMid meet">
                                <path d={piece.svgPath} className="piece-path" />
                                {piece.internalClosedSvgPath && <path d={piece.internalClosedSvgPath} className="piece-internal-closed" />}
                                {piece.internalOpenSvgPath && <path d={piece.internalOpenSvgPath} className="piece-internal-open" />}
                              </svg>
                            </div>
                            <div className="piece-details">
                              <p className="piece-name">{piece.name}</p>
                              <div className="piece-inputs">
                                <input type="text" className="piece-input" placeholder="Material..." defaultValue={piece.material || ''} onBlur={(e) => handlePieceUpdate(piece.id, { material: e.target.value })} />
                                <input type="number" className="piece-input" placeholder="Cant. Pza / Par" defaultValue={piece.quantity || ''} onBlur={(e) => handlePieceUpdate(piece.id, { quantity: parseInt(e.target.value) || undefined })} />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-tab-state"><p>Sube un archivo DXF para procesar automáticamente los bloques y renderizar las piezas de este producto.</p></div>
                  )}
                </div>
              )}

              {activeTab === 'plano' && (
                <div className="plano-tab" style={{ width: '100%', height: '80vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="plano-toolbar" style={{ display: 'flex', gap: '1rem', padding: '0.5rem' }}>
                    <button className="cta-button" onClick={() => planoInputRef.current?.click()}><Upload size={18} />Cargar DXF de Plano</button>
                    <input type="file" ref={planoInputRef} onChange={handlePlanoDxfUpload} accept=".dxf" style={{ display: 'none' }} />
                    {product.planoPaths && product.planoPaths.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.8rem', marginLeft: 'auto', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                        <button
                          className="cta-button"
                          onClick={() => {
                            setIs3D(!is3D);
                            if (!is3D) {
                              setIsMeasuring(false);
                              setMeasureStart(null);
                              setMeasureEnd(null);
                            }
                          }}
                          style={{ background: is3D ? 'var(--accent-color)' : '#475569', minWidth: '100px' }}
                        >
                          {is3D ? '🧊 Vista 3D: ON' : '⬛ Vista 2D'}
                        </button>

                        {is3D ? (
                          <div className="3d-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', flex: 1, maxWidth: '600px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '0.65rem', opacity: 0.7 }}>Explosión</label>
                                <span style={{ fontSize: '0.65rem' }}>{explosion}px</span>
                              </div>
                              <input type="range" min="0" max="200" value={explosion} onChange={(e) => setExplosion(Number(e.target.value))} style={{ width: '100%', height: '4px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '0.65rem', opacity: 0.7 }}>Rotación X</label>
                                <span style={{ fontSize: '0.65rem' }}>{rotateX}°</span>
                              </div>
                              <input type="range" min="-60" max="60" value={rotateX} onChange={(e) => setRotateX(Number(e.target.value))} style={{ width: '100%', height: '4px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '0.65rem', opacity: 0.7 }}>Rotación Y</label>
                                <span style={{ fontSize: '0.65rem' }}>{rotateY}°</span>
                              </div>
                              <input type="range" min="-180" max="180" value={rotateY} onChange={(e) => setRotateY(Number(e.target.value))} style={{ width: '100%', height: '4px' }} />
                            </div>
                            <button onClick={() => { setRotateX(0); setRotateY(0); setExplosion(0); }} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.7rem' }}>🔄</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="cta-button"
                              onClick={() => {
                                setIsMeasuring(!isMeasuring);
                                setMeasureStart(null);
                                setMeasureEnd(null);
                              }}
                              style={{ background: isMeasuring ? '#ef4444' : '#6366f1' }}
                            >
                              {isMeasuring ? '✖ Finalizar Regla' : '📏 Medir Distancia'}
                            </button>
                            {savedMeasurements.length > 0 && (
                              <button className="cta-button" onClick={() => setSavedMeasurements([])} style={{ background: '#475569' }}>
                                🗑️ Borrar Medidas
                              </button>
                            )}
                            <button className="cta-button" onClick={() => handleAddAnnotation('plano', 'arrow')} style={{ background: 'var(--text-primary)' }}>➔ Flecha</button>
                            <button className="cta-button" onClick={() => handleAddAnnotation('plano', 'text')} style={{ background: 'var(--text-primary)' }}>T Texto</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className="plano-viewer-container"
                    style={{
                      flex: 1,
                      display: 'flex',
                      gap: '1rem',
                      overflow: 'hidden',
                      perspective: is3D ? '1000px' : 'none'
                    }}
                  >
                    <div
                      className="plano-viewer"
                      style={{
                        flex: 1,
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid rgba(0,0,0,0.05)',
                        position: 'relative',
                        overflow: is3D ? 'visible' : 'hidden',
                        cursor: isMeasuring ? 'crosshair' : 'default',
                        perspective: is3D ? '1000px' : 'none'
                      }}
                      onClick={() => !isMeasuring && setSelectedElementId(null)}
                      onMouseDown={handlePlanoMouseInteractions}
                      onMouseMove={handlePlanoMouseInteractions}
                      onMouseUp={handlePlanoMouseInteractions}
                      onMouseLeave={handlePlanoMouseInteractions}
                      onWheel={handlePlanoWheel}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {product.planoPaths && product.planoPaths.length > 0 ? (
                        <motion.div
                          animate={{
                            rotateX: is3D ? rotateX : 0,
                            rotateY: is3D ? rotateY : 0,
                            scale: planoScale,
                            x: planoPan.x,
                            y: planoPan.y
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            position: 'relative',
                            transformStyle: 'preserve-3d',
                          }}
                          transition={{ type: 'spring', damping: 25, stiffness: 150 }}
                        >
                          {(() => {
                            return orderedLayers.map((layerName, layerIdx) => {
                              const layerPaths = product.planoPaths!.filter(p => p.layer === layerName && !hiddenLayers.has(p.layer));
                              if (layerPaths.length === 0) return null;

                              const zOffset = is3D ? layerIdx * explosion : 0;

                              return (
                                <motion.div
                                  key={layerName}
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    transformStyle: 'preserve-3d',
                                    pointerEvents: 'none',
                                    filter: is3D ? 'drop-shadow(0 15px 25px rgba(0,0,0,0.15))' : 'none',
                                    zIndex: layerIdx
                                  }}
                                  animate={{ z: zOffset }}
                                  transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                                >
                                  <svg
                                    viewBox={product.planoViewBox}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      overflow: 'visible',
                                      display: 'block'
                                    }}
                                  >
                                    {layerPaths.map((path, idx) => (
                                      <path
                                        key={idx}
                                        d={path.d}
                                        stroke={path.color}
                                        strokeWidth={is3D ? "1" : "0.5"}
                                        fill={path.isClosed ? path.color : 'none'}
                                        fillOpacity={path.isClosed ? (is3D ? 0.5 : 0.3) : 0}
                                      />
                                    ))}


                                  </svg>
                                </motion.div>
                              );
                            });
                          })()}

                          {/* Overlays (Measurements & Icons) - Always on top layer or shared SVG */}
                          <svg
                            viewBox={product.planoViewBox}
                            style={{
                              width: '100%',
                              height: '100%',
                              position: 'absolute',
                              inset: 0,
                              overflow: 'visible',
                              pointerEvents: 'none',
                              zIndex: 100,
                              transform: is3D ? `translateZ(${(Array.from(new Set(product.planoPaths!.map(p => p.layer))).length + 1) * explosion}px)` : 'none',
                              transformStyle: 'preserve-3d'
                            }}
                          >
                            {/* Saved Measurements */}
                            {savedMeasurements.map(m => (
                              <g key={m.id}>
                                <line x1={m.start.x} y1={m.start.y} x2={m.end.x} y2={m.end.y} stroke="#fcd34d" strokeWidth="1.5" strokeDasharray="4 2" />
                                <circle cx={m.start.x} cy={m.start.y} r="2.5" fill="#fcd34d" />
                                <circle cx={m.end.x} cy={m.end.y} r="2.5" fill="#fcd34d" />
                                <text x={(m.start.x + m.end.x) / 2} y={(m.start.y + m.end.y) / 2 - 10} fill="#fcd34d" fontSize="12" fontWeight="bold" textAnchor="middle" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                                  {Math.sqrt(Math.pow(m.end.x - m.start.x, 2) + Math.pow(m.end.y - m.start.y, 2)).toFixed(2)} mm
                                </text>
                              </g>
                            ))}

                            {/* Active Measuring Guide */}
                            {isMeasuring && measureStart && measureEnd && (
                              <g>
                                <line x1={measureStart.x} y1={measureStart.y} x2={measureEnd.x} y2={measureEnd.y} stroke="#fff" strokeWidth="1" strokeDasharray="4 2" />
                                <circle cx={measureStart.x} cy={measureStart.y} r="2" fill="#ef4444" />
                                <circle cx={measureEnd.x} cy={measureEnd.y} r="2" fill="#ef4444" />
                                <text x={(measureStart.x + measureEnd.x) / 2} y={(measureStart.y + measureEnd.y) / 2 - 10} fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                                  {Math.sqrt(Math.pow(measureEnd.x - measureStart.x, 2) + Math.pow(measureEnd.y - measureStart.y, 2)).toFixed(2)} mm
                                </text>
                              </g>
                            )}
                          </svg>

                          {product.annotations?.['plano']?.map(ann => (
                            <InteractiveAnnotationItem
                              key={ann.id}
                              annotation={ann}
                              operationId="plano"
                              onTransformEnd={handleTransformAnnotation}
                              onDelete={handleDeleteAnnotation}
                              onTextChange={handleTextChangeAnnotation}
                              isSelected={selectedElementId === ann.id}
                              onSelect={() => setSelectedElementId(ann.id)}
                            />
                          ))}
                        </motion.div>
                      ) : (
                        <div className="empty-tab-state" style={{ color: '#666' }}>
                          <p>Carga un archivo DXF para visualizar el plano completo de ingeniería.</p>
                        </div>
                      )}
                    </div>

                    {/* Layers Sidebar */}
                    {product.planoPaths && product.planoPaths.length > 0 && (
                      <div className="plano-layers-sidebar" style={{ width: '250px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Capas ({Array.from(new Set(product.planoPaths.map(p => p.layer))).length})</h4>
                          <button onClick={showAllLayers} style={{ fontSize: '0.7rem', color: 'var(--accent-color)', background: 'none', border: 'none', cursor: 'pointer' }}>Mostrar Todo</button>
                        </div>
                        <Reorder.Group
                          axis="y"
                          onReorder={handleReorderLayers}
                          values={orderedLayers}
                          style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', listStyle: 'none' }}
                        >
                          {orderedLayers.map(layerName => {
                            const isVisible = !hiddenLayers.has(layerName);
                            return (
                              <Reorder.Item
                                key={layerName}
                                value={layerName}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  background: isVisible ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.1)',
                                  opacity: isVisible ? 1 : 0.6,
                                  marginBottom: '4px',
                                  cursor: 'grab',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                                whileDrag={{
                                  scale: 1.02,
                                  backgroundColor: "rgba(99, 102, 241, 0.2)",
                                  boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                                  cursor: 'grabbing'
                                }}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleLayer(layerName); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                                >
                                  {isVisible ? '👁️' : '🕶️'}
                                </button>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'none' }}>{layerName}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); isolateLayer(layerName); }}
                                  style={{ fontSize: '0.7rem', opacity: isVisible ? 0.7 : 0, pointerEvents: isVisible ? 'auto' : 'none', padding: '2px 4px', borderRadius: '4px', border: '1px solid currentColor', background: 'none', color: 'var(--text-secondary)' }}
                                >
                                  Solo
                                </button>
                                <div style={{ opacity: 0.3, cursor: 'grab' }} title="Arrastrar para reordenar">☰</div>
                              </Reorder.Item>
                            );
                          })}
                        </Reorder.Group>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'ficha_tecnica' && (
                <div className="ficha-tecnica-container" style={{ display: 'flex', gap: '1.5rem', height: '100%', overflow: 'hidden', padding: '0.5rem' }}>
                  {product.sizes && product.sizes.length > 0 && (
                    <div className="size-sidebar" style={{ width: '60px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.03)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', height: 'max-content' }}>
                      <div className="sidebar-actions" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                        <button onClick={exportFichaToPdf} title="Exportar PDF" style={{ width: '32px', height: '32px', background: '#ef444422', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}><FileDown size={14} /></button>
                        <button onClick={exportToExcel} title="Exportar Excel" style={{ width: '32px', height: '32px', background: '#10b98122', color: '#10b981', border: '1px solid #10b981', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}><FileDown size={14} /></button>
                        <button onClick={() => xmlInputRef.current?.click()} title="Importar XML" style={{ width: '32px', height: '32px', background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}><Upload size={14} /></button>
                      </div>
                      <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.2rem' }}>Tallas</span>
                      {product.sizes.map((sz, szIdx) => (
                        <button
                          key={sz || `sz-${szIdx}`}
                          onClick={() => setSelectedFichaSize(sz)}
                          className={`size-btn ${selectedFichaSize === sz ? 'active' : ''}`}
                          style={{
                            padding: '0.6rem',
                            border: '1px solid',
                            borderColor: selectedFichaSize === sz ? 'var(--accent-color)' : 'var(--border-color)',
                            borderRadius: '8px',
                            background: selectedFichaSize === sz ? 'var(--accent-color)' : 'transparent',
                            color: selectedFichaSize === sz ? 'white' : 'var(--text-primary)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.8rem'
                          }}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  )}

                    <input type="file" ref={xmlInputRef} onChange={handleXmlUpload} accept=".xml" style={{ display: 'none' }} />
                    <div className="ficha-sheet-wrapper" style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.05)' }}>
                      <div className="letter-paper" style={{ background: 'white', color: 'black', width: '210mm', minHeight: '297mm', padding: '15mm', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', height: 'max-content' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '15px' }}>
                          <div>
                            <h1 style={{ margin: 0, fontSize: '20px', color: '#111' }}>{product.name}</h1>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                              <p style={{ margin: '4px 0 0', color: '#555', fontSize: '12px' }}><strong>ID:</strong> {product.id.split('-')[0]}</p>
                              <p style={{ margin: '4px 0 0', color: '#e63946', fontSize: '13px', fontWeight: 'bold' }}><strong>TALLA:</strong> {selectedFichaSize}</p>
                            </div>
                            <p style={{ margin: '2px 0 0', color: '#555', fontSize: '11px' }}><strong>Fecha:</strong> {new Date(product.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div style={{ width: '100px', height: '100px', border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden' }}>
                            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                        <thead>
                          <tr style={{ background: '#eee', borderBottom: '2px solid #333' }}>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Componente</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'left' }}>Material</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center', width: '40px' }}>Pzas</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center', width: '40px' }}>Esp.</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center', width: '40px' }}>Area</th>
                            <th style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center', width: '70px' }}>Consumo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const mergedPieces = [
                              ...(product?.pieces || []),
                              ...(currentVariation?.extraTechnicalRows || [])
                            ];

                            const currentSizePieces = mergedPieces.map(p => {
                              const sData = p.sizeData?.[selectedFichaSize] || {};
                              return {
                                ...p,
                                area: sData.area || p.area || '',
                                areaWaste: sData.areaWaste || p.areaWaste || '',
                                quantity: sData.quantity || p.quantity || 2,
                                material: sData.material || p.material || 'Sin Asignar',
                                materialId: sData.materialId || p.materialId || '',
                                thickness: sData.thickness || p.thickness || ''
                              };
                            }).sort((a, b) => {
                              const getWeight = (p: any) => {
                                const mat = (p.material || '').toUpperCase();
                                if (mat.includes('PIEL') || mat.includes('CUERO') || mat.includes('CARNAZA')) return 1;
                                if (mat.includes('MALLA') || mat.includes('TEXTIL') || mat.includes('SINT')) return 2;
                                if (mat.includes('FORRO')) return 3;
                                if (mat.includes('ESPONJA') || mat.includes('ESPUMA')) return 4;
                                if (mat.includes('BETA')) return 5;
                                return 6;
                              };
                              const wA = getWeight(a);
                              const wB = getWeight(b);
                              if (wA !== wB) return wA - wB;
                              return a.name.localeCompare(b.name);
                            });

                            const localMatGroups: Record<string, { totalArea: number, count: number }> = {};
                            currentSizePieces.forEach(p => {
                              const mat = p.material;
                              if (!localMatGroups[mat]) localMatGroups[mat] = { totalArea: 0, count: 0 };
                              localMatGroups[mat].count++;
                              const areaVal = parseFloat((p.areaWaste || '0').replace(',', '.'));
                              if (!isNaN(areaVal)) localMatGroups[mat].totalArea += areaVal;
                            });

                            const seenMaterials = new Set<string>();

                            return currentSizePieces.map((piece, index) => {
                              const mat = piece.material || 'Sin Asignar';
                              const isFirstOfMaterial = !seenMaterials.has(mat);
                              if (isFirstOfMaterial) seenMaterials.add(mat);
                              return (
                                <tr key={`${piece.id}-${index}`} style={{ background: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                                    {piece.isManual ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input 
                                          type="text" 
                                          defaultValue={piece.name}
                                          onBlur={(e) => {
                                            handlePieceUpdate(piece.id, { name: e.target.value.toUpperCase() }, selectedFichaSize);
                                          }}
                                          style={{ border: 'none', borderBottom: '1px dashed #ccc', width: '100%', fontSize: 'inherit', textTransform: 'uppercase' }}
                                        />
                                        <button 
                                          onClick={() => handleDeletePiece(piece.id)}
                                          className="no-print"
                                          style={{ border: 'none', background: 'none', color: '#ff4444', cursor: 'pointer', padding: '2px' }}
                                          title="Eliminar fila informativa"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      piece.name
                                    )}
                                  </td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                                    <MaterialCell 
                                      currentMaterial={mat}
                                      materialId={piece.materialId}
                                      catalog={catalogMaterials}
                                      onOpenCatalog={onOpenCatalog!}
                                      onAssign={(matId: string, matName: string) => {
                                        handlePieceUpdate(piece.id, { 
                                          material: matName, 
                                          materialId: matId 
                                        }, selectedFichaSize);
                                      }}
                                    />
                                  </td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{piece.quantity}</td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{piece.thickness}</td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{piece.areaWaste}</td>
                                  {isFirstOfMaterial && <td rowSpan={localMatGroups[mat].count} style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{formatDecimal(localMatGroups[mat].totalArea)}</td>}
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>

                      {/* Botón para añadir piezas manuales (Icono + pequeño) */}
                      <button 
                        onClick={() => {
                          const allSizesData: Record<string, any> = {};
                          (product.sizes || ['27']).forEach(sz => {
                            allSizesData[sz] = {
                              area: '0',
                              areaWaste: '0',
                              quantity: 1,
                              material: 'SIN ASIGNAR',
                              thickness: ''
                            };
                          });

                          const newRow = {
                            id: `extra-${Date.now()}`,
                            name: 'NUEVA INFORMACIÓN',
                            quantity: 1,
                            material: 'SIN ASIGNAR',
                            thickness: '',
                            isManual: true,
                            sizeData: allSizesData
                          };
                          const updatedVariations = (product?.variations || []).map(v => 
                            v.id === currentVariation.id 
                              ? { ...v, extraTechnicalRows: [...(v.extraTechnicalRows || []), newRow as any] }
                              : v
                          );
                          onUpdate(product!.id, { variations: updatedVariations });
                        }}
                        className="no-print"
                        style={{
                          marginTop: '0.4rem',
                          width: '24px',
                          height: '24px',
                          background: 'var(--accent-color)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        title="Añadir Fila Manual"
                      >
                        <Plus size={14} />
                      </button>

                      <div style={{ marginTop: '10px' }}>
                        <h2 style={{ fontSize: '13px', borderBottom: '2px solid #333', paddingBottom: '2px', marginBottom: '6px' }}>DETALLE DE ENSUELADO</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                          <tbody>
                            {[
                              { 
                                label: 'SUELA', 
                                field: 'suela', 
                                fieldId: 'suelaId',
                                autoFill: () => getPositionTranslation(product.name, 2, 1, nomenclature) || 'N/A'
                              },
                              { 
                                label: 'COLOR SUELA', 
                                field: 'colorSuela', 
                                fieldId: 'colorSuelaId',
                                autoFill: () => getPositionTranslation(product.name, 2, 2, nomenclature) || 'N/A'
                              },
                              { label: 'AGUJETA', field: 'agujeta', fieldId: 'agujetaId' },
                              { label: 'PLANTILLA', field: 'plantilla', fieldId: 'plantillaId' },
                              { label: 'GANCHOS', field: 'ganchos', fieldId: 'ganchosId' }
                            ].map((row, idx) => {
                              const vSpecs = currentVariation?.visualSpecs || {} as VisualSpecs;
                              const specValue = vSpecs[row.field as keyof VisualSpecs] || (row.autoFill ? row.autoFill() : 'NINGUNO');
                              const specId = vSpecs[row.fieldId as keyof VisualSpecs];

                              return (
                                <tr key={`ensuelado-${idx}`}>
                                  <td style={{ border: '1px solid #ddd', padding: '10px', fontWeight: 'bold', background: '#fafafa' }}>{row.label}</td>
                                  <td style={{ border: '1px solid #ddd', padding: '0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <MaterialCell 
                                        currentMaterial={specValue as string}
                                        materialId={specId as string}
                                        catalog={catalogMaterials}
                                        onOpenCatalog={onOpenCatalog!}
                                        showNoneOption={true}
                                        onAssign={(matId: string, matName: string) => {
                                          handleUpdateVisualSpecs({
                                            [row.field]: matName,
                                            [row.fieldId]: matId
                                          });
                                        }}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'suajes' && (
                <div className="suajes-tab">
                  <div className="suajes-sidebar">
                    {flatPiecesSorted.map((piece, idx) => (
                      <button
                        key={`${piece.id}-${idx}`}
                        className={`suaje-sidebar-button ${selectedSuajePieceId === piece.id ? 'active' : ''}`}
                        onClick={() => setSelectedSuajePieceId(piece.id)}
                      >
                        {piece.name}
                      </button>
                    ))}
                  </div>
                  <div className="suaje-sheet-viewer">
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 100 }}>
                      <button className="cta-button" onClick={() => {
                        setSuajeExportSelection(new Set(((product.pieces || []) || []).map(p => p.id)));
                        setShowSuajeExportModal(true);
                      }} style={{ background: '#ef4444' }}>
                        <FileDown size={18} /> Exportar PDF
                      </button>
                    </div>
                    {(() => {
                      const selectedPiece = ((product.pieces || []) || []).find(p => p.id === selectedSuajePieceId);
                      if (!selectedPiece) return <div className="empty-tab-state">Selecciona una pieza para visualizar</div>;

                      return (
                        <div className="letter-sheet">
                          <div className="sheet-header-refined">
                            <div className="header-left">
                              <span>FOLIO: EDD-{product.id.split('-')[0]}</span>
                              <span>FECHA: {new Date().toLocaleDateString()}</span>
                            </div>
                            <div className="header-center">
                              <h1>{product.name}</h1>
                            </div>
                            <div className="header-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <Logo width={64} height={40} color="#1e293b" />
                            </div>
                          </div>

                          <div className="sheet-content-refined">
                            <div className="suaje-svg-container">
                              <svg viewBox={selectedPiece.viewBox}>
                                <path d={selectedPiece.svgPath} className="piece-path-suaje" />
                                {selectedPiece.internalClosedSvgPath && <path d={selectedPiece.internalClosedSvgPath} className="piece-internal-closed-suaje" />}
                                {selectedPiece.internalOpenSvgPath && <path d={selectedPiece.internalOpenSvgPath} className="piece-internal-open-suaje" />}
                              </svg>
                            </div>
                          </div>

                          <div className="sheet-footer-refined">
                            <div className="info-grid">
                              <div className="info-item">
                                <span className="info-label">Tallas</span>
                                <span className="info-value">22 - 31</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Fecha</span>
                                <span className="info-value">{new Date().toLocaleDateString()}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Nombre del Modelo</span>
                                <span className="info-value">{product.name}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Nombre de la Pieza</span>
                                <span className="info-value">{selectedPiece.name}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Tipo de Suaje</span>
                                <select
                                  className="suaje-select"
                                  value={selectedPiece.suajeType || (selectedPiece.quantity === 4 ? 'FLEJE de 19mm - 2 Filos' : 'FLEJE de 19mm - 1 Filo')}
                                  onChange={(e) => handlePieceUpdate(selectedPiece.id, { suajeType: e.target.value })}
                                >
                                  <option value="FLEJE de 19mm - 1 Filo">FLEJE de 19mm - 1 Filo</option>
                                  <option value="FLEJE de 19mm - 2 Filos">FLEJE de 19mm - 2 Filos</option>
                                  <option value="Serratado de 32mm - 1 Filo">Serratado de 32mm - 1 Filo</option>
                                  <option value="Avio de 64mm - 1 Filo">Avio de 64mm - 1 Filo</option>
                                </select>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Color de Suaje</span>
                                <div className="suaje-color-palette">
                                  <span className="color-name-display">{getClosestSuajeColorName(product.suajeColor || '#1e293b')}</span>
                                  {BASE_SUAJE_COLORS.map(c => (
                                    <div
                                      key={c.hex}
                                      className={`color-swatch ${product.suajeColor === c.hex ? 'active' : ''}`}
                                      style={{ background: c.hex }}
                                      onClick={() => onUpdate(product.id, { suajeColor: c.hex })}
                                      title={c.name}
                                    />
                                  ))}
                                  <input
                                    type="color"
                                    className="custom-color-input"
                                    value={product.suajeColor || '#1e293b'}
                                    onChange={(e) => onUpdate(product.id, { suajeColor: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeTab === 'ajustes' && (
                <div className="flowchart-tab" style={{ width: '100%', height: '80vh', position: 'relative', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
                  <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', gap: '8px' }}>
                    <button className="cta-button" onClick={handleAddOperation}>+ Nueva Operación</button>
                    <button className="cta-button" onClick={handleAutoLayout} style={{ background: 'var(--text-secondary)' }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ↺
                      </motion.div>
                      Reordenar Automático
                    </button>
                  </div>
                  <ReactFlow
                    nodes={augmentedNodes}
                    edges={edges}
                    nodeTypes={rfNodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onEdgeClick={onEdgeClick}
                    onNodeDoubleClick={(_, node) => setActiveTab(node.id)}
                    fitView
                    colorMode="light"
                    defaultEdgeOptions={{
                      style: { stroke: '#6366f1', strokeWidth: 4, opacity: 0.8 },
                      type: 'default',
                      animated: false
                    }}
                  >

                    <Controls />
                  </ReactFlow>
                  <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10, fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.8)', padding: '4px 8px', borderRadius: '4px', pointerEvents: 'none' }}>
                    Tip: Haz clic en una conexión para eliminarla, o usa la tecla Supr.
                  </div>
                </div>
              )}

              {nodes.map(node => {
                if (activeTab !== node.id) return null;
                const operationLabel = (node.data.label as string).toLowerCase();
                const isRayadoOp = operationLabel.startsWith('rayado de componentes');
                const excludedIds = new Set((node.data.excludedPieces as string[]) || []);

                const autoDetectedIds = flatPiecesSorted.filter(p => {
                  const escapedName = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const regex = new RegExp(`\\b${escapedName}\\b`, 'i');
                  const matchesName = regex.test(operationLabel);

                  const matRegex = p.material ? new RegExp(`\\b${p.material.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') : null;
                  const matchesMaterial = matRegex ? matRegex.test(operationLabel) : false;

                  const isExcluded = excludedIds.has(p.id);
                  if (isRayadoOp) {
                    return (matchesName || matchesMaterial) && !!p.internalOpenSvgPath && !isExcluded;
                  }
                  return (matchesName || matchesMaterial) && !isExcluded;
                }).map(p => p.id);

                const manualPieceIds = ((node.data.manualPieces as string[]) || []).filter(id => !excludedIds.has(id));
                const activeIdsSet = new Set([...autoDetectedIds, ...manualPieceIds]);
                const savedOrder = (node.data.pieceOrder as string[]) || [];

                const activePieces = Array.from(activeIdsSet)
                  .map(id => flatPiecesSorted.find(p => p.id === id))
                  .filter(Boolean) as Piece[];

                activePieces.sort((a, b) => {
                  const idxA = savedOrder.indexOf(a.id);
                  const idxB = savedOrder.indexOf(b.id);
                  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                  return 0;
                });

                const availablePiecesToAdd = flatPiecesSorted.filter(p => !activeIdsSet.has(p.id));
                const viewMode = (node.data.viewMode as '2D' | '3D') || '2D';

                return (
                  <div key={node.id} className="operation-dynamic-tab" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                    <div className="operation-header-edit" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', margin: '0 auto 2rem' }}>
                      <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Nombre de la Operación</label>
                      <input type="text" className="text-input" style={{ fontSize: '1.25rem', fontWeight: 'bold', padding: '1rem', background: 'var(--surface-color-light)' }} value={node.data.label as string} onChange={(e) => setNodes(nds => { const nextNodes = nds.map(n => n.id === node.id ? { ...n, data: { ...n.data, label: e.target.value } } : n); onUpdate(product!.id, { operationsNodes: nextNodes }); return nextNodes; })} />
                    </div>

                    <div className="matched-pieces-area" style={{ width: '100%', display: 'flex', gap: '2rem', height: '70vh' }}>
                      <div className="pieces-sidebar" style={{ width: '300px', flexShrink: 0, background: 'var(--surface-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                          <h3 style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>Inventario (Orden Z)</h3>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>1° = Fondo</span>
                        </div>
                        <Reorder.Group axis="y" values={activePieces} onReorder={(newOrder: Piece[]) => { const nextNodes = nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, pieceOrder: newOrder.map(p => p.id) } } : n); setNodes(nextNodes); onUpdate(product!.id, { operationsNodes: nextNodes }); }} style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {activePieces.map((piece, pIdx) => {
                            const hasInPlano = product.planoPaths?.some(path => pieceMatchesLayer(piece, path.layer));
                            const pieceColor = getGrayGradient(pIdx, activePieces.length);
                            return (
                              <Reorder.Item key={piece.id} value={piece} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: 'var(--surface-color-light)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'grab' }} whileDrag={{ scale: 1.05, boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: pieceColor, border: '1px solid rgba(0,0,0,0.1)' }} />
                                <p style={{ fontSize: '0.85rem', margin: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {piece.name}
                                  {!hasInPlano && (
                                    <span title="No encontrado en el plano/3D">
                                      <AlertTriangle size={14} color="#f59e0b" />
                                    </span>
                                  )}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNodes(nds => {
                                      const nextNodes = nds.map(n => {
                                        if (n.id !== node.id) return n;
                                        const currentManual = (n.data.manualPieces as string[]) || [];
                                        const currentExcluded = (n.data.excludedPieces as string[]) || [];
                                        return {
                                          ...n,
                                          data: {
                                            ...n.data,
                                            manualPieces: currentManual.filter(id => id !== piece.id),
                                            excludedPieces: [...currentExcluded, piece.id]
                                          }
                                        };
                                      });
                                      onUpdate(product!.id, { operationsNodes: nextNodes });
                                      return nextNodes;
                                    });
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  title="Quitar de esta operación"
                                >
                                  <X size={14} />
                                </button>
                              </Reorder.Item>
                            );
                          })}
                        </Reorder.Group>
                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                          <select className="text-input" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', background: 'var(--surface-color-light)' }} value="" onChange={(e) => {
                            const pieceId = e.target.value;
                            const nextNodes = nodes.map(n => {
                              if (n.id !== node.id) return n;
                              const currentManual = (n.data.manualPieces as string[]) || [];
                              const currentExcluded = (n.data.excludedPieces as string[]) || [];
                              return {
                                ...n,
                                data: {
                                  ...n.data,
                                  manualPieces: [...currentManual, pieceId],
                                  excludedPieces: currentExcluded.filter(id => id !== pieceId)
                                }
                              };
                            });
                            setNodes(nextNodes);
                            onUpdate(product!.id, { operationsNodes: nextNodes });
                          }}>
                            <option value="" disabled>Añadir pieza...</option>
                            {availablePiecesToAdd.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div
                        className="operation-3d-viewer"
                        style={{
                          flex: 1,
                          position: 'relative',
                          background: 'white',
                          borderRadius: '12px',
                          border: '1px solid rgba(0,0,0,0.08)',
                          overflow: 'hidden',
                          perspective: viewMode === '3D' ? '1200px' : 'none',
                          cursor: isDraggingPlano !== 'none' ? 'grabbing' : 'grab'
                        }}
                        onMouseDown={(e) => viewMode === '3D' && handleOperationMouseInteractions(node.id, e)}
                        onMouseMove={(e) => viewMode === '3D' && handleOperationMouseInteractions(node.id, e)}
                        onMouseUp={(e) => viewMode === '3D' && handleOperationMouseInteractions(node.id, e)}
                        onMouseLeave={(e) => viewMode === '3D' && handleOperationMouseInteractions(node.id, e)}
                        onWheel={(e) => viewMode === '3D' && handleOperationWheel(node.id, e)}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setSelectionModeNodeId(selectionModeNodeId === node.id ? null : node.id)}
                            style={{
                              background: selectionModeNodeId === node.id ? '#10b981' : 'rgba(0,0,0,0.5)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              padding: '0.4rem 1rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              color: '#fff',
                              backdropFilter: 'blur(4px)',
                              cursor: 'pointer'
                            }}
                          >
                            {selectionModeNodeId === node.id ? '✅ Finalizar Selección' : '➕ Agregar Piezas del Plano'}
                          </button>
                          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden', backdropFilter: 'blur(4px)' }}>
                            <button
                              onClick={() => {
                                const nextNodes = nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, viewMode: '2D', viewState: { ...((n.data.viewState as any) || {}), rotateX: 0, rotateY: 0 } } } : n);
                                setNodes(nextNodes);
                                onUpdate(product!.id, { operationsNodes: nextNodes });
                              }}
                              style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', color: '#fff', background: viewMode === '2D' ? 'var(--accent-color)' : 'transparent', border: 'none', cursor: 'pointer' }}
                            >2D</button>
                            <button
                              onClick={() => {
                                const nextNodes = nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, viewMode: '3D' } } : n);
                                setNodes(nextNodes);
                                onUpdate(product!.id, { operationsNodes: nextNodes });
                              }}
                              style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', color: '#fff', background: viewMode === '3D' ? 'var(--accent-color)' : 'transparent', border: 'none', cursor: 'pointer' }}
                            >3D</button>
                          </div>
                          {/* Needle Tool (Aguja) */}
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => {
                                if (stitchingSession?.nodeId === node.id) {
                                  setStitchingSession(null);
                                } else {
                                  setStitchingSession({ nodeId: node.id, step: 'BOTTOM' });
                                }
                              }}
                              title="Herramienta de Costura (Aguja)"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                background: stitchingSession?.nodeId === node.id ? 'var(--accent-color)' : 'rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                color: '#fff'
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="2" y1="22" x2="14" y2="10" />
                                <path d="M12 8l4 4" />
                                <circle cx="18" cy="6" r="3" />
                              </svg>
                            </button>
                            {stitchingSession?.nodeId === node.id && (
                              <div style={{
                                position: 'absolute',
                                top: 40,
                                right: 0,
                                zIndex: 100,
                                whiteSpace: 'nowrap',
                                background: 'var(--accent-color)',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                pointerEvents: 'none'
                              }}>
                                {stitchingSession?.step === 'BOTTOM' ? '📍 Selecciona pieza de ABAJO' : '📍 Selecciona pieza de ARRIBA'}
                              </div>
                            )}
                          </div>

                          {/* Overlap Tool (Empalmes) */}
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => {
                                if (empalmeSession?.nodeId === node.id) {
                                  setEmpalmeSession(null);
                                } else {
                                  setEmpalmeSession({ 
                                    nodeId: node.id, 
                                    step: 'MAIN', 
                                    selectedSecondaries: [], 
                                    suggestedLayers: [] 
                                  });
                                }
                              }}
                              title="Herramienta de Empalme"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                background: empalmeSession?.nodeId === node.id ? '#ef4444' : 'rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                color: '#fff'
                              }}
                            >
                              <Layers size={18} />
                            </button>
                            {empalmeSession?.nodeId === node.id && (
                              <div style={{
                                position: 'absolute',
                                top: 40,
                                right: 0,
                                background: 'rgba(15, 23, 42, 0.95)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                padding: '8px',
                                width: '220px',
                                zIndex: 100,
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                              }}>
                                <div style={{ fontSize: '0.75rem', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                                  {empalmeSession?.step === 'MAIN' ? '📐 Selecciona pieza PRINCIPAL' : '📐 Selecciona piezas SECUNDARIAS'}
                                </div>
                                {empalmeSession?.step === 'SECONDARY' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                      Piezas sugeridas en amarillo. Selecciona hasta 2.
                                    </div>
                                    <button 
                                      disabled={empalmeSession?.selectedSecondaries.length === 0}
                                      onClick={() => {
                                        handleEmpalmeAdd(node.id, { 
                                          mainLayer: empalmeSession?.mainLayer!.trim(), 
                                          secondaries: empalmeSession?.selectedSecondaries.map(s => s.trim()) 
                                        });
                                        setEmpalmeSession(null);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '6px',
                                        borderRadius: '4px',
                                        background: empalmeSession?.selectedSecondaries.length > 0 ? '#ef4444' : 'rgba(255,255,255,0.05)',
                                        color: empalmeSession?.selectedSecondaries.length > 0 ? 'white' : '#64748b',
                                        border: 'none',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Check size={14} /> Confirmar Empalme
                                    </button>
                                  </div>
                                )}
                                
                                {((node.data.manualEmpalmes as any[]) || []).length > 0 && (
                                  <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '6px' }}>Empalmes Activos:</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                                      {((node.data.manualEmpalmes as any[]) || []).map((emp, i) => (
                                        <div key={`empalme-active-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem' }}>
                                          <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.mainLayer} + {emp.secondaries.length}</span>
                                          <button onClick={() => handleEmpalmeDelete(node.id, i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                            <Trash size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                </div>
                              )}
                            </div>
                          </div>

                        <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10, display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.6)', padding: '0.75rem', borderRadius: '10px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.6rem', color: '#999', textTransform: 'uppercase' }}>Explosión</label>
                            <input
                              type="range"
                              min="0" max="150"
                              value={(node.data.viewState as any)?.explosion ?? 30}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const nextNodes = nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, viewState: { ...((n.data.viewState as any) || {}), explosion: val } } } : n);
                                setNodes(nextNodes);
                                onUpdate(product!.id, { operationsNodes: nextNodes });
                              }}
                              style={{ width: '80px', height: '4px' }}
                            />
                          </div>
                          <button
                            onClick={() => {
                              const nextNodes = nodes.map(n => n.id === node.id ? { ...n, data: { ...n.data, viewState: { rotateX: 0, rotateY: 0, scale: 1, pan: { x: 0, y: 0 }, explosion: 30 } } } : n);
                              setNodes(nextNodes);
                              onUpdate(product!.id, { operationsNodes: nextNodes });
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Reset
                          </button>
                        </div>

                        {/* Interactive Trimming Control Panel */}
                        <AnimatePresence>
                          {editingStitch && editingStitch.nodeId === node.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 20, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 20, scale: 0.95 }}
                              style={{
                                position: 'absolute',
                                bottom: 80,
                                right: 16,
                                zIndex: 500,
                                background: 'rgba(15, 23, 42, 0.95)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '16px',
                                padding: '1.25rem',
                                width: '280px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                color: 'white'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: '#22c55e' }}>●</span> Ajustar Costura
                                </h4>
                                <button onClick={() => setEditingStitch(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                  <X size={18} />
                                </button>
                              </div>

                              {(() => {
                                const stitch = (node.data.manualStitches as any[])?.[editingStitch.index];
                                if (!stitch) return null;
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Inicio</label>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#22c55e' }}>{stitch.startPct || 0}%</span>
                                      </div>
                                      <input
                                        type="range" min="0" max="95" step="1"
                                        value={stitch.startPct || 0}
                                        onChange={(e) => handleStitchUpdate(node.id, editingStitch.index, { startPct: Number(e.target.value) })}
                                        style={{ width: '100%', accentColor: '#22c55e' }}
                                      />
                                    </div>

                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fin</label>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#22c55e' }}>{stitch.endPct === undefined ? 100 : stitch.endPct}%</span>
                                      </div>
                                      <input
                                        type="range" min="5" max="100" step="1"
                                        value={stitch.endPct === undefined ? 100 : stitch.endPct}
                                        onChange={(e) => handleStitchUpdate(node.id, editingStitch.index, { endPct: Number(e.target.value) })}
                                        style={{ width: '100%', accentColor: '#22c55e' }}
                                      />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <label style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color de Hilo</label>
                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {['#000000', '#ffffff', '#78350f', '#1e40af', '#b91c1c', '#d97706'].map(c => (
                                          <button
                                            key={c}
                                            onClick={() => handleStitchUpdate(node.id, editingStitch.index, { color: c })}
                                            style={{
                                              width: '24px', height: '24px', borderRadius: '50%',
                                              background: c, border: stitch.color === c ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.2)',
                                              cursor: 'pointer', transition: 'transform 0.2s'
                                            }}
                                          />
                                        ))}
                                        <input 
                                          type="color" 
                                          value={stitch.color || '#000000'} 
                                          onChange={(e) => handleStitchUpdate(node.id, editingStitch.index, { color: e.target.value })}
                                          style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <label style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agujas</label>
                                      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', marginTop: '4px' }}>
                                        {[1, 2, 3].map(n => (
                                          <button
                                            key={n}
                                            onClick={() => handleStitchUpdate(node.id, editingStitch.index, { needleCount: n })}
                                            style={{
                                              flex: 1, padding: '4px', border: 'none', borderRadius: '6px',
                                              background: stitch.needleCount === n ? '#22c55e' : 'transparent',
                                              color: stitch.needleCount === n ? 'white' : '#94a3b8',
                                              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                                            }}
                                          >
                                            {n}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                          <label style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase' }}>Densidad (Puntadas)</label>
                                        </div>
                                        <input
                                          type="range" min="2" max="10" step="0.5"
                                          value={parseFloat((stitch.dashArray || '4 3').split(' ')[0])}
                                          onChange={(e) => {
                                            const v = e.target.value;
                                            handleStitchUpdate(node.id, editingStitch.index, { dashArray: `${v} ${parseFloat(v)*0.75}` });
                                          }}
                                          style={{ width: '100%', accentColor: '#22c55e' }}
                                        />
                                      </div>

                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                          <label style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase' }}>Suavizar Esquinas</label>
                                          <span style={{ fontSize: '0.70rem', fontWeight: 600, color: '#22c55e' }}>{stitch.smoothing || 0}</span>
                                        </div>
                                        <input
                                          type="range" min="0" max="3" step="1"
                                          value={stitch.smoothing || 0}
                                          onChange={(e) => handleStitchUpdate(node.id, editingStitch.index, { smoothing: Number(e.target.value) })}
                                          style={{ width: '100%', accentColor: '#22c55e' }}
                                        />
                                      </div>

                                    <button
                                      onClick={() => handleStitchDelete(node.id, editingStitch.index)}
                                      style={{
                                        marginTop: '0.5rem',
                                        padding: '0.6rem',
                                        borderRadius: '8px',
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      <Trash2 size={14} /> Eliminar Costura
                                    </button>
                                  </div>
                                );
                              })()}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <motion.div
                          animate={{
                            rotateX: viewMode === '3D' ? ((node.data.viewState as any)?.rotateX ?? -20) : 0,
                            rotateY: viewMode === '3D' ? ((node.data.viewState as any)?.rotateY ?? 20) : 0,
                            scale: (node.data.viewState as any)?.scale ?? 1,
                            x: (node.data.viewState as any)?.pan?.x ?? 0,
                            y: (node.data.viewState as any)?.pan?.y ?? 0
                          }}
                          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                        >
                          {(() => {
                            if (!product.planoPaths) return null;
                            const explosion = (node.data.viewState as any)?.explosion ?? 30;
                            const isSelectionMode = selectionModeNodeId === node.id;

                            const uniqueOpLayers = Array.from(new Set(product.planoPaths.map(p => p.layer))).sort();

                            // Strict Layer Mapping based ONLY on activePieces
                            const layersToRender = isSelectionMode
                              ? uniqueOpLayers
                              : activePieces.map(piece => {
                                const matchingPath = product.planoPaths?.find(path => pieceMatchesLayer(piece, path.layer));
                                return matchingPath ? matchingPath.layer : null;
                              }).filter(Boolean) as string[];

                            const piecesFullData = layersToRender.map(lName => ({
                              name: lName,
                              paths: product.planoPaths!.filter(p => p.layer === lName)
                            }));

                            return piecesFullData.map((layerInfo, idx) => {
                              const layerName = layerInfo.name;
                              const layerPaths = layerInfo.paths;
                              const pieceIndex = activePieces.findIndex(p => pieceMatchesLayer(p, layerName));
                              const pieceColor = pieceIndex !== -1 ? getGrayGradient(pieceIndex, activePieces.length) : '#94a3b8';
                              const isActive = pieceIndex !== -1;
                              const belowPieces = piecesFullData.slice(0, idx);
                              const clipId = `v18-mask-${node.id}-${idx}`;

                              return (
                                <motion.div
                                  key={`${layerName}-${idx}`}
                                  animate={{ z: idx * (viewMode === '3D' ? explosion : 0.1) }} // Small Z in 2D to avoid flickering
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    transformStyle: 'preserve-3d',
                                    pointerEvents: 'none',
                                    filter: viewMode === '3D' ? 'drop-shadow(0 12px 20px rgba(0,0,0,0.12))' : 'none',
                                    opacity: !isSelectionMode || isActive ? 1 : 0.2
                                  }}
                                >
                                  <svg viewBox={product.planoViewBox} style={{ width: '100%', height: '100%', overflow: 'visible' }}>




                                    {layerPaths.map((path, pIdx) => (
                                      <React.Fragment key={`${layerName}-path-${pIdx}`}>
                                        <path
                                          d={path.d}
                                          stroke="transparent"
                                          strokeWidth="20"
                                          fill={path.isClosed ? "transparent" : 'none'}
                                          style={{
                                            pointerEvents: (isSelectionMode || (stitchingSession?.nodeId === node.id) || (empalmeSession?.nodeId === node.id)) ? 'auto' : 'none',
                                            cursor: (isSelectionMode || (stitchingSession?.nodeId === node.id) || (empalmeSession?.nodeId === node.id)) ? 'pointer' : 'default'
                                          }}
                                          onClick={(e) => {
                                            // Handle Overlap Logic
                                            if (empalmeSession?.nodeId === node.id) {
                                              e.stopPropagation();
                                              if (empalmeSession?.step === 'MAIN') {
                                                // Suggest overlapping pieces
                                                const mainBox = getBoundingBox(path.d);
                                                const suggestions = product.planoPaths!
                                                  .filter(p => p.layer !== layerName)
                                                  .filter(p => checkOverlaps(mainBox, getBoundingBox(p.d)))
                                                  .map(p => p.layer);
                                                
                                                setEmpalmeSession({ nodeId: node.id, step: 'SECONDARY',
                                                  mainLayer: layerName,
                                                  suggestedLayers: Array.from(new Set(suggestions)), selectedSecondaries: [] });
                                              } else if (empalmeSession?.step === 'SECONDARY') {
                                                if (layerName === empalmeSession?.mainLayer) return;
                                                const isSelected = empalmeSession?.selectedSecondaries.includes(layerName);
                                                let next;
                                                if (isSelected) {
                                                  next = empalmeSession?.selectedSecondaries.filter(l => l !== layerName);
                                                } else {
                                                  if (empalmeSession?.selectedSecondaries.length >= 2) return;
                                                  next = [...empalmeSession?.selectedSecondaries, layerName];
                                                }
                                                setEmpalmeSession(prev => prev ? { ...prev, selectedSecondaries: next } : null);
                                              }
                                              return;
                                            }

                                            if (stitchingSession?.nodeId === node.id) {
                                              e.stopPropagation();
                                              if (stitchingSession?.step === 'BOTTOM') {
                                                setStitchingSession({ nodeId: node.id, step: 'TOP', bottomLayer: layerName });
                                              } else if (stitchingSession?.step === 'TOP' && stitchingSession?.bottomLayer) {
                                                const bottom = stitchingSession?.bottomLayer;
                                                const top = layerName;
                                                setNodes(nds => {
                                                  const nextNodes = nds.map(n => {
                                                    if (n.id !== node.id) return n;
                                                    const currentManualStitches = (n.data.manualStitches as any[]) || [];
                                                    return {
                                                      ...n,
                                                      data: {
                                                        ...n.data,
                                                        manualStitches: [...currentManualStitches, { 
                                                          bottomLayer: bottom, 
                                                          topLayer: top,
                                                          color: '#000000',
                                                          needleCount: 1,
                                                          dashArray: '4 3',
                                                          smoothing: 0,
                                                          startPct: 0,
                                                          endPct: 100
                                                        }]
                                                      }
                                                    };
                                                  });
                                                  onUpdate(product!.id, { operationsNodes: nextNodes });
                                                  return nextNodes;
                                                });
                                                setStitchingSession(null);
                                              }
                                              return;
                                            }
                                            if (!isSelectionMode) return;
                                            e.stopPropagation();
                                            const pieceRef = flatPiecesSorted.find(p => pieceMatchesLayer(p, layerName));
                                            if (!pieceRef) {
                                              alert(`No se encontró una pieza en el inventario que coincida con la capa "${layerName}".`);
                                              return;
                                            }

                                            setNodes(nds => {
                                              const nextNodes = nds.map(n => {
                                                if (n.id !== node.id) return n;
                                                const currentManual = (n.data.manualPieces as string[]) || [];
                                                const currentExcluded = (n.data.excludedPieces as string[]) || [];
                                                const isAlreadyManual = currentManual.includes(pieceRef.id);

                                                let nextManual = currentManual;
                                                let nextExcluded = currentExcluded;

                                                if (isAlreadyManual) {
                                                  nextManual = currentManual.filter(id => id !== pieceRef.id);
                                                  nextExcluded = [...currentExcluded, pieceRef.id];
                                                } else {
                                                  nextManual = [...currentManual, pieceRef.id];
                                                  nextExcluded = currentExcluded.filter(id => id !== pieceRef.id);
                                                }
                                                return { ...n, data: { ...n.data, manualPieces: nextManual, excludedPieces: nextExcluded } };
                                              });
                                              onUpdate(product!.id, { operationsNodes: nextNodes });
                                              return nextNodes;
                                            });
                                          }}
                                        />
                                        <path
                                          d={path.d}
                                          stroke={isActive ? (viewMode === '3D' ? '#fff' : '#666') : '#ccc'}
                                          strokeWidth={isActive ? "0.7" : "0.3"}
                                          strokeDasharray={
                                            (empalmeSession?.nodeId === node.id && empalmeSession?.mainLayer?.trim() === layerName?.trim()) ? "4 4" : 
                                            (empalmeSession?.nodeId === node.id && empalmeSession?.suggestedLayers.some(s => s.trim() === layerName?.trim())) ? "2 2" : "none"
                                          }
                                          fill={
                                            (empalmeSession?.nodeId === node.id && empalmeSession?.mainLayer?.trim() === layerName?.trim()) ? "rgba(34, 197, 94, 0.2)" :
                                            (empalmeSession?.nodeId === node.id && empalmeSession?.selectedSecondaries.some(s => s.trim() === layerName?.trim())) ? "rgba(239, 68, 68, 0.3)" :
                                            (empalmeSession?.nodeId === node.id && empalmeSession?.suggestedLayers.some(s => s.trim() === layerName?.trim())) ? "rgba(234, 179, 8, 0.2)" :
                                            (path.isClosed ? pieceColor : 'none')
                                          }
                                          fillOpacity={path.isClosed ? 0.9 : 0}
                                          style={{ pointerEvents: 'none' }}
                                        />
                                      </React.Fragment>
                                    ))}

                                    {/* Manual Overlaps (Empalmes) Render */}
                                    {((node.data.manualEmpalmes as any[]) || []).map((emp, eIdx) => {
                                      if (emp.mainLayer?.trim() !== layerName?.trim()) return null;
                                      const mainPath = layerPaths.reduce((prev, curr) => (prev.d.length > curr.d.length ? prev : curr), layerPaths[0]);
                                      if (!mainPath) return null;
                                      
                                      const secondaryPaths = product.planoPaths!.filter(p => emp.secondaries.some((s: string) => s.trim() === p.layer.trim()));
                                      const mskId = `v27-ovl-mask-${node.id}-${layerName.replace(/\s+/g, '-')}-${eIdx}`;

                                      return (
                                        <g key={`empalme-render-${eIdx}`}>
                                          <defs>
                                            <mask id={mskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                                              <rect x="-100000" y="-100000" width="200000" height="200000" fill="black" />
                                              {secondaryPaths.map((p, pi) => (
                                                <path key={`mask-path-${pi}`} d={p.d} fill="white" />
                                              ))}
                                            </mask>
                                          </defs>
                                          <path
                                            d={mainPath.d}
                                            fill="rgba(239, 68, 68, 0.7)"
                                            mask={`url(#${mskId})`}
                                            style={{ pointerEvents: 'none' }}
                                          />
                                        </g>
                                      );
                                    })}
                                    {/* Manual Stitches for this piece (as TOP layer) */}
                                    {((node.data.manualStitches as any[]) || []).map((stitch, sIdx) => {
                                      if (stitch.topLayer !== layerName) return null;
                                      const bottomPaths = product.planoPaths!.filter(p => p.layer === stitch.bottomLayer);
                                      if (bottomPaths.length === 0) return null;

                                      const mainPath = layerPaths.reduce((prev, curr) => (prev.d.length > curr.d.length ? prev : curr), layerPaths[0]);
                                      if (!mainPath) return null;
                                      const offsetD = offsetPath(mainPath.d, 2.0, stitch.smoothing || 0);
                                      const trimmedD = getTrimmedPath(offsetD, stitch.startPct, stitch.endPct);
                                      const mskId = `manual-mask-${node.id}-${idx}-${sIdx}`;
                                      const isSelected = editingStitch?.nodeId === node.id && editingStitch?.index === sIdx;

                                      return (
                                        <g
                                          key={`manual-stitch-${sIdx}`}
                                          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingStitch({ nodeId: node.id, index: sIdx });
                                          }}
                                        >
                                          <defs>
                                            <mask id={mskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                                              <rect x="-500%" y="-500%" width="1000%" height="1000%" fill="black" />
                                              {bottomPaths.map((p, pi) => (
                                                <path key={`stitch-mask-${pi}`} d={p.d} fill="white" />
                                              ))}
                                            </mask>
                                          </defs>

                                          {/* Hit-box for easier selection */}
                                          <path
                                            d={trimmedD}
                                            stroke="transparent"
                                            strokeWidth="15"
                                            fill="none"
                                            mask={`url(#${mskId})`}
                                          />

                                          {/* Render 1, 2 or 3 parallel lines */}
                                          {(() => {
                                            const count = stitch.needleCount || 1;
                                            const offsets = count === 1 ? [2.0] : (count === 2 ? [2.0, 3.5] : [2.0, 3.5, 5.0]);
                                            return offsets.map((off, oIdx) => {
                                              const offD = offsetPath(mainPath.d, off, stitch.smoothing || 0);
                                              const trimOffD = getTrimmedPath(offD, stitch.startPct, stitch.endPct);
                                              return (
                                                <path
                                                  key={`stitch-line-${oIdx}`}
                                                  d={trimOffD}
                                                  stroke={isSelected ? "#fbbf24" : (stitch.color || "#000000")}
                                                  strokeWidth={isSelected ? "1.0" : "0.6"}
                                                  strokeDasharray={stitch.dashArray || "4 3"}
                                                  strokeLinejoin="round"
                                                  strokeLinecap="round"
                                                  fill="none"
                                                  mask={`url(#${mskId})`}
                                                  style={{ opacity: 1 }}
                                                />
                                              );
                                            });
                                          })()}

                                          {/* Selection Indicator (Glow only when selected) */}
                                          {isSelected && (
                                            <path
                                              d={trimmedD}
                                              stroke="#fbbf24"
                                              strokeWidth="2.5"
                                              fill="none"
                                              mask={`url(#${mskId})`}
                                              style={{ opacity: 0.3, filter: 'blur(2px)' }}
                                            />
                                          )}
                                        </g>
                                      );
                                    })}

                                    {/* Stitching Layer - Dual Layer for High Contrast + Offset */}

                                  </svg>
                                </motion.div>
                              );
                            });
                          })()}
                        </motion.div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSuajeExportModal && (
          <div className="export-modal-overlay" onClick={() => setShowSuajeExportModal(false)}>
            <motion.div
              className="export-modal-container"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="export-modal-header">
                <h3>Exportar PDF de Suajes</h3>
                <button className="close-button" onClick={() => setShowSuajeExportModal(false)}><X size={20} /></button>
              </div>

              <div className="export-modal-body">
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
                  Selecciona las piezas que deseas incluir en el archivo PDF. Cada pieza ocupará una hoja tamaño carta.
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    onClick={() => setSuajeExportSelection(new Set(((product.pieces || []) || []).map(p => p.id)))}
                  >Seleccionar Todas</button>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    onClick={() => setSuajeExportSelection(new Set())}
                  >Deseleccionar Todas</button>
                </div>

                <div className="selection-grid">
                  {flatPiecesSorted.map((piece, pIdx) => (
                    <label key={piece.id || `export-piece-${pIdx}`} className="selection-item">
                      <input
                        type="checkbox"
                        checked={suajeExportSelection.has(piece.id)}
                        onChange={(e) => {
                          const next = new Set(suajeExportSelection);
                          if (e.target.checked) next.add(piece.id);
                          else next.delete(piece.id);
                          setSuajeExportSelection(next);
                        }}
                      />
                      <span className="info-value" style={{ fontSize: '0.9rem' }}>{piece.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="export-modal-footer">
                <button className="btn-secondary" onClick={() => setShowSuajeExportModal(false)}>Cancelar</button>
                <button
                  className="btn-primary"
                  disabled={suajeExportSelection.size === 0}
                  onClick={() => exportSuajesToPdf(Array.from(suajeExportSelection))}
                >
                  Generar PDF ({suajeExportSelection.size})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fullscreenPiece && (
          <div className="modal-overlay fullscreen-piece-overlay" onClick={() => setFullscreenPiece(null)}>
            <motion.div className="fullscreen-piece-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <button className="close-button absolute-close" onClick={() => setFullscreenPiece(null)}><X size={32} /></button>
              <div className="fullscreen-header">
                <h2>{fullscreenPiece.name}</h2>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <span className="metadata-badge">{fullscreenPiece.material}</span>
                  <span className="metadata-badge" style={{ background: 'var(--surface-color-light)', color: 'var(--text-primary)' }}>x{fullscreenPiece.quantity || 2}</span>
                </div>
              </div>
              <div className="fullscreen-svg-container">
                <svg viewBox={fullscreenPiece.viewBox} className="piece-svg fullscreen-svg">
                  <path d={fullscreenPiece.svgPath} className="piece-path" style={{ fill: stringToColor(fullscreenPiece.material || '') }} />
                  {fullscreenPiece.internalClosedSvgPath && <path d={fullscreenPiece.internalClosedSvgPath} className="piece-internal-closed" />}
                  {fullscreenPiece.internalOpenSvgPath && <path d={fullscreenPiece.internalOpenSvgPath} className="piece-internal-open" />}
                </svg>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
