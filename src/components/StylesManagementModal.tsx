import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, ChevronRight, Hash } from 'lucide-react';
import { useStyles } from '../hooks/useStyles';

interface StylesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SelectedPos = { segment: 1 | 2 | 3; position: number; length: number } | null;

export function StylesManagementModal({ isOpen, onClose }: StylesManagementModalProps) {
  const { nomenclature, updatePositionMeaning, updatePositionMappings, getMeaning, getMappings } = useStyles();
  const [selectedPos, setSelectedPos] = useState<SelectedPos>(null);
  const [previewName] = useState('2589 R26');
  
  // Local state for mappings to ensure stability and avoid numeric key sorting issues
  const [localMap, setLocalMap] = useState<{ id: string, key: string, val: string }[]>([]);

  useEffect(() => {
    if (selectedPos) {
      const current = getMappings(selectedPos.segment, selectedPos.position);
      setLocalMap(Object.entries(current).map(([k, v]) => ({ id: Math.random().toString(), key: k, val: v })));
    } else {
      setLocalMap([]);
    }
  }, [selectedPos, getMappings]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay">
        <motion.div 
          className="modal-content nomenclature-modal"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <div className="modal-header">
            <div className="title-with-icon">
              <Hash size={24} className="accent-icon" />
              <h2>Configuración de Nomenclatura</h2>
            </div>
            <button className="close-button" onClick={onClose}><X /></button>
          </div>

          <div className="nomenclature-layout">
             <div className="nomenclature-main">
                <div className="preview-banner">
                  <span className="label">Estilo de Ejemplo:</span>
                  <div className="style-badge large">
                    {previewName.split('').map((char, i) => (
                      <span key={i} className="char">{char}</span>
                    ))}
                  </div>
                </div>

                <div className="segments-grid">
                   {[1, 2, 3].map((segNum) => {
                      const segmentPositions = nomenclature.positions.filter(p => p.segment === segNum);
                      return (
                        <div key={segNum} className="segment-card">
                           <div className="seg-header">
                              <h3>Segmento {segNum}</h3>
                           </div>
                           <div className="positions-list">
                              {segmentPositions.map((pos) => (
                                <button 
                                  key={pos.position}
                                  className={`pos-item ${selectedPos?.segment === segNum && selectedPos?.position === pos.position ? 'active' : ''}`}
                                  onClick={() => setSelectedPos({ segment: segNum as 1|2|3, position: pos.position, length: pos.length || 1 })}
                                >
                                  <div className="pos-info">
                                    <span className="pos-num">Dig. {pos.position} - {pos.position + (pos.length || 1) - 1}</span>
                                    <span className="pos-label">{getMeaning(segNum as 1|2|3, pos.position)}</span>
                                  </div>
                                  <ChevronRight size={16} />
                                </button>
                              ))}
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>

             <div className="nomenclature-editor">
                {selectedPos ? (
                  <div className="editor-inner">
                    <div className="editor-header">
                      <Tag size={18} />
                      <h3>Editar Posición</h3>
                    </div>
                    
                    <div className="form-group">
                      <label>Significado de la Posición</label>
                      <input 
                        type="text"
                        value={getMeaning(selectedPos.segment, selectedPos.position)}
                        onChange={(e) => updatePositionMeaning(selectedPos.segment, selectedPos.position, e.target.value)}
                        placeholder="Ej: Estilo, Horma, Color..."
                      />
                    </div>

                    <div className="mappings-section">
                       <label>Mapeo de Valores (Opcional)</label>
                       <p className="hint">Traduce códigos de DXF a nombres legibles</p>
                       
                       <div className="mappings-list">
                          {localMap.map((m, idx) => (
                            <div key={m.id} className="mapping-row">
                               <input 
                                 placeholder="Código" 
                                 value={m.key} 
                                 onChange={(e) => {
                                   const next = [...localMap];
                                   next[idx].key = e.target.value;
                                   setLocalMap(next);
                                 }}
                               />
                               <span className="arrow">→</span>
                               <input 
                                 placeholder="Nombre" 
                                 value={m.val}
                                 onChange={(e) => {
                                   const next = [...localMap];
                                   next[idx].val = e.target.value;
                                   setLocalMap(next);
                                 }}
                               />
                            </div>
                          ))}
                          <button 
                            className="text-btn"
                            onClick={() => setLocalMap([...localMap, { id: Math.random().toString(), key: '', val: '' }])}
                          >
                            + Añadir Mapeo
                          </button>
                       </div>
                    </div>

                    <button 
                      className="cta-button"
                      onClick={() => {
                        const finalMap: Record<string, string> = {};
                        localMap.forEach(m => {
                          if (m.key.trim()) finalMap[m.key.trim()] = m.val;
                        });
                        updatePositionMappings(selectedPos.segment, selectedPos.position, finalMap);
                      }}
                    >
                      Guardar Mapeos
                    </button>
                  </div>
                ) : (
                  <div className="empty-editor">
                    <Hash size={48} />
                    <p>Selecciona una posición para editar su significado y mapeos</p>
                  </div>
                )}
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
