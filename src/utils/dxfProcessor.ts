// @ts-ignore
import DxfParser from 'dxf-parser';
import type { Piece } from '../types';

export function processDxfContent(dxfString: string): Piece[] {
  const parser = new DxfParser();

  const autoAssignProperties = (cleanName: string) => {
    const name = cleanName.toLowerCase();
    let material = 'Sin Asignar';
    
    // Priority mapping (complex terms first to avoid false overwrites)
    if (name.includes('forro')) {
      material = 'FORRO';
    } else if (name.includes('relleno de cuello')) {
      material = 'ESPONJA 10/40';
    } else if (name.includes('relleno de fuelle') || name.includes('relleno de lengüeta') || name.includes('relleno de lengueta')) {
      material = 'ESPONJA 7/20';
    } else if (name.includes('contrahorte')) {
      material = 'BETA';
    } else if (name.includes('cuello') || name.includes('fuelle') || name.includes('lengüeta') || name.includes('lengueta')) {
      material = 'MALLA';
    } else if (name.includes('chinela') || name.includes('tubo') || name.includes('calzador') || name.includes('complemento') || name.includes('paloma')) {
      material = 'PIEL';
    }

    let quantity = 2;
    if (name.includes('tubo') || name.includes('lateral') || name.includes('vista')) {
      quantity = 4;
    }

    return { material, quantity };
  };

  let dxf;
  try {
    dxf = parser.parseSync(dxfString);
  } catch (err) {
    console.error("Dxf parse error", err);
    throw new Error('No se pudo analizar el archivo DXF');
  }

  const pieces: Piece[] = [];
  
  if (!dxf || !dxf.blocks) {
    return pieces;
  }

  // Iterar sobre los bloques
  Object.values(dxf.blocks).forEach((block: any) => {
    // Ignorar bloques sin nombre o generados automáticamente que inician con *
    if (!block.name || block.name.startsWith('*')) return;

    const entities = block.entities || [];
    
    let outlineEntities: any[] = [];
    let internalEntities: any[] = [];

    entities.forEach((e: any) => {
      if (e.layer && e.layer.toLowerCase() === 'outline') {
        outlineEntities.push(e);
      } else {
        internalEntities.push(e);
      }
    });

    if (outlineEntities.length === 0) {
      let maxArea = -1;
      let outlineIdx = -1;
      const polylines = entities.filter((e: any) => e.type === 'POLYLINE' || e.type === 'LWPOLYLINE');
      
      polylines.forEach((poly: any, idx: number) => {
         let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
         (poly.vertices || []).forEach((v: any) => {
            pMinX = Math.min(pMinX, v.x); pMinY = Math.min(pMinY, v.y);
            pMaxX = Math.max(pMaxX, v.x); pMaxY = Math.max(pMaxY, v.y);
         });
         const area = (pMaxX - pMinX) * (pMaxY - pMinY);
         if (area > maxArea) {
            maxArea = area; outlineIdx = idx;
         }
      });

      if (outlineIdx !== -1) {
         outlineEntities.push(polylines[outlineIdx]);
         entities.forEach((e: any) => {
            if (e !== polylines[outlineIdx]) internalEntities.push(e);
         });
      } else {
         internalEntities = [...entities];
      }
    }

    if (outlineEntities.length === 0) return;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    const processEntitiesToPath = (entityList: any[], updateBounds = false) => {
      let openD = '';
      let closedD = '';
      const update = (x: number, y: number) => {
        if (updateBounds) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      };

      entityList.forEach((entity: any) => {
        let tempD = '';
        let isClosed = false;

        if (entity.type === 'LINE') {
          const v1 = entity.vertices[0];
          const v2 = entity.vertices[1];
          if (v1 && v2) {
            update(v1.x, v1.y); update(v2.x, v2.y);
            tempD += `M ${v1.x} ${v1.y} L ${v2.x} ${v2.y} `;
            isClosed = false;
          }
        } 
        else if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
          const vertices = entity.vertices;
          if (vertices && vertices.length > 0) {
            const start = vertices[0];
            tempD += `M ${start.x} ${start.y} `;
            update(start.x, start.y);

            for (let i = 1; i < vertices.length; i++) {
              const v = vertices[i];
              tempD += `L ${v.x} ${v.y} `;
              update(v.x, v.y);
            }
            
            isClosed = !!(entity.shape || entity.closed);
            // Outline solid is always handled as closed eventually
            if ((isClosed || updateBounds) && tempD.trim() !== '') {
               tempD += 'Z ';
               isClosed = true;
            }
          }
        }
        else if (entity.type === 'CIRCLE') {
          if (entity.center && entity.radius) {
            const { x: cx, y: cy } = entity.center;
            const r = entity.radius;
            update(cx - r, cy - r);
            update(cx + r, cy + r);
            tempD += `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0 `;
            isClosed = true;
          }
        }
        else if (entity.type === 'ARC') {
          if (entity.center && entity.radius !== undefined) {
             const { x: cx, y: cy } = entity.center;
             const r = entity.radius;
             let start = entity.startAngle;
             let end = entity.endAngle;
             if (start !== undefined && end !== undefined) {
                if (end < start) end += Math.PI * 2;
                const segments = 16;
                const step = (end - start) / segments;
                for (let i = 0; i <= segments; i++) {
                   const angle = start + step * i;
                   const px = cx + r * Math.cos(angle);
                   const py = cy + r * Math.sin(angle);
                   update(px, py);
                   if (i === 0) tempD += `M ${px} ${py} `;
                   else tempD += `L ${px} ${py} `;
                }
                isClosed = false;
             }
          }
        }
        
        if (isClosed) {
           closedD += tempD;
         } else {
           openD += tempD;
         }
      });
      return { openD, closedD };
    };

    const outlinePaths = processEntitiesToPath(outlineEntities, true);
    const internalPaths = processEntitiesToPath(internalEntities, false);
    const outlineCombinedD = outlinePaths.closedD + outlinePaths.openD;

    if (outlineCombinedD.trim() !== '' && minX !== Infinity) {
      const width = maxX - minX;
      const height = maxY - minY;
      
      const padding = Math.max(width, height) * 0.05;
      const viewBox = `${minX - padding} ${minY - padding} ${width + padding*2} ${height + padding*2}`;

      let cleanName = block.name.replace(/_/g, ' ').replace(/270/g, '').replace(/\s+/g, ' ').trim();
      const { material, quantity } = autoAssignProperties(cleanName);

      pieces.push({
        id: crypto.randomUUID(),
        name: cleanName,
        svgPath: outlineCombinedD.trim(),
        internalClosedSvgPath: internalPaths.closedD.trim(),
        internalOpenSvgPath: internalPaths.openD.trim(),
        viewBox,
        material,
        quantity
      });
    }
  });

  return pieces;
}

const getRandomVibrantColor = () => {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h}, 70%, 60%)`;
};

export function processFullDxfContent(dxfString: string): { paths: { d: string, color: string, isClosed: boolean, layer: string }[], viewBox: string } {
  const parser = new DxfParser();
  let dxf;
  try {
    dxf = parser.parseSync(dxfString);
  } catch (err) {
    throw new Error('No se pudo analizar el archivo DXF');
  }

  if (!dxf) return { paths: [], viewBox: '0 0 100 100' };

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  const paths: { d: string, color: string, isClosed: boolean, layer: string }[] = [];

  const updateBounds = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  const processEntity = (entity: any) => {
    let tempD = '';
    let isClosed = false;
    const layer = entity.layer || '0';

    // Negate Y to fix inversion
    if (entity.type === 'LINE') {
      const v1 = entity.vertices[0];
      const v2 = entity.vertices[1];
      if (v1 && v2) {
        updateBounds(v1.x, -v1.y); updateBounds(v2.x, -v2.y);
        tempD += `M ${v1.x} ${-v1.y} L ${v2.x} ${-v2.y} `;
      }
    } 
    else if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
      const vertices = entity.vertices;
      if (vertices && vertices.length > 0) {
        tempD += `M ${vertices[0].x} ${-vertices[0].y} `;
        updateBounds(vertices[0].x, -vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
          const v = vertices[i];
          tempD += `L ${v.x} ${-v.y} `;
          updateBounds(v.x, -v.y);
        }
        if (entity.shape || entity.closed) {
          tempD += 'Z ';
          isClosed = true;
        }
      }
    }
    else if (entity.type === 'CIRCLE') {
      if (entity.center && entity.radius) {
        const { x: cx, y: cy } = entity.center;
        const nCy = -cy;
        const r = entity.radius;
        updateBounds(cx - r, nCy - r);
        updateBounds(cx + r, nCy + r);
        tempD += `M ${cx - r},${nCy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0 `;
        isClosed = true;
      }
    }
    else if (entity.type === 'ARC') {
      if (entity.center && entity.radius !== undefined) {
        const { x: cx, y: cy } = entity.center;
        const nCy = -cy;
        const r = entity.radius;
        let start = entity.startAngle;
        let end = entity.endAngle;
        if (start !== undefined && end !== undefined) {
          // Negative angles for Y-flip
          const nStart = -start;
          const nEnd = -end;
          
          const segments = 16;
          const step = (nEnd - nStart) / segments;
          for (let i = 0; i <= segments; i++) {
            const angle = nStart + step * i;
            const px = cx + r * Math.cos(angle);
            const py = nCy + r * Math.sin(angle);
            updateBounds(px, py);
            if (i === 0) tempD += `M ${px} ${py} `;
            else tempD += `L ${px} ${py} `;
          }
        }
      }
    }

    if (tempD.trim() !== '') {
      paths.push({
        d: tempD.trim(),
        color: getRandomVibrantColor(),
        isClosed,
        layer
      });
    }
  };

  // Process all entities
  if (dxf.entities) {
    dxf.entities.forEach((e: any) => processEntity(e));
  }

  if (dxf.blocks) {
    Object.values(dxf.blocks).forEach((block: any) => {
      if (block.entities) {
        block.entities.forEach((e: any) => processEntity(e));
      }
    });
  }

  if (minX === Infinity) return { paths: [], viewBox: '0 0 100 100' };

  const width = maxX - minX;
  const height = maxY - minY;
  const padding = Math.max(width, height) * 0.05;
  const viewBox = `${minX - padding} ${minY - padding} ${width + padding*2} ${height + padding*2}`;

  return { paths, viewBox };
}
