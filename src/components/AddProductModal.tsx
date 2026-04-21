import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStyles } from '../hooks/useStyles';
import { validateStyleName } from '../utils/styleValidation';
import type { Product } from '../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: { id?: string; name: string; image: string }) => void;
  initialData?: Product | null;
}

export function AddProductModal({ isOpen, onClose, onSave, initialData }: AddProductModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image || null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { nomenclature } = useStyles();

  // Validate nomenclature in real-time
  const styleValidation = useMemo(() => {
    if (!name.trim()) return null;
    return validateStyleName(name, nomenclature);
  }, [name, nomenclature]);

  // Sync state with initialData when modal opens
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setImagePreview(initialData.image);
    } else {
      setName('');
      setImagePreview(null);
    }
  }, [initialData, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        setError('La imagen es demasiado grande. Máximo 2MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, ingresa el nombre del estilo.');
      return;
    }

    if (styleValidation && !styleValidation.isValid) {
      setError(`Estructura de nombre inválida: ${styleValidation.error}`);
      return;
    }

    if (!imagePreview) {
      setError('Por favor, selecciona una imagen.');
      return;
    }

    onSave({ 
      id: initialData?.id, 
      name: name.toUpperCase(), 
      image: imagePreview 
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay">
        <motion.div 
          className="modal-content glass-panel"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <div className="modal-header">
            <h2>{initialData ? 'Editar Producto' : 'Agregar Nuevo Producto'}</h2>
            <button className="close-button" onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="product-form">
            <div className="form-group">
              <label htmlFor="product-name">Nombre del Estilo (Nomenclatura)</label>
              <div className="input-with-feedback">
                <input
                  id="product-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Ej. 2589 R26"
                  className={`text-input ${styleValidation ? (styleValidation.isValid ? 'valid' : 'invalid') : ''}`}
                />
                {styleValidation && (
                  <div className={`validation-status ${styleValidation.isValid ? 'success' : 'error'}`}>
                    {styleValidation.isValid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{styleValidation.isValid ? 'Formato Correcto' : styleValidation.error}</span>
                  </div>
                )}
              </div>
              
              {styleValidation?.isValid && styleValidation.description && (
                <div className="generated-description-preview">
                  <strong>Interpretación Técnica:</strong>
                  <p>{styleValidation.description}</p>
                </div>
              )}
              
              <p className="field-hint">Formato: (3-4 Números) + (3 Alfanum) + [2 Alfanum opcionales]</p>
            </div>

            <div className="form-group">
              <label>Imagen del Producto</label>
              <div 
                className="image-upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Vista previa" className="image-preview" />
                ) : (
                  <div className="upload-placeholder">
                    <ImageIcon size={48} className="upload-icon" />
                    <p>Haz clic para seleccionar una imagen</p>
                    <span className="upload-hint">JPG, PNG o WEBP (Max 2MB)</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/jpeg, image/png, image/webp"
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="submit-button cta-button">
                <Upload size={18} />
                {initialData ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
