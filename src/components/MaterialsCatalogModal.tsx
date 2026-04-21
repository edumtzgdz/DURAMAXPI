import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Search, Plus, Trash2, Edit2, TrendingUp, Calendar, Tag, Ruler } from 'lucide-react';
import { useMaterials } from '../hooks/useMaterials';
import type { Material, UnitOfMeasure } from '../types';

interface MaterialsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Material> | null;
  onSelect?: (material: Material) => void;
}

const UNITS: UnitOfMeasure[] = ['Dm2', 'm', 'Yardas', 'kg', 'g', 'pz', 'm²'];

export function MaterialsCatalogModal({ isOpen, onClose, initialData, onSelect }: MaterialsCatalogModalProps) {
  const { 
    materials, 
    categories, 
    addMaterial, 
    updateMaterial, 
    deleteMaterial, 
    addCategory
  } = useMaterials();

  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    unit: 'Dm2' as UnitOfMeasure,
    cost: 0,
    thicknessMin: 0,
    thicknessMax: 0,
    color: '#000000',
    supplier: '',
    image: '',
  });

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategoryId ? m.categoryId === activeCategoryId : true;
    return matchesSearch && matchesCategory;
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen es demasiado grande. Máximo 5MB.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    try {
      let finalImageUrl = formData.image;

      if (selectedFile) {
        const { uploadFile } = await import('../utils/apiClient');
        const uploadResult = await uploadFile(selectedFile);
        finalImageUrl = uploadResult.url;
      }

      const materialData = { ...formData, image: finalImageUrl };

      if (editingId) {
        await updateMaterial(editingId, materialData);
        setEditingId(null);
      } else {
        await addMaterial(materialData);
      }
      
      setShowAddForm(false);
      resetForm();
    } catch (e: any) {
      setError('Error al guardar: ' + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      unit: 'Dm2',
      cost: 0,
      thicknessMin: 0,
      thicknessMax: 0,
      color: '#000000',
      supplier: '',
      image: '',
    });
    setImagePreview(null);
    setSelectedFile(null);
    setError(null);
  };

  const handleEdit = (material: Material) => {
    setFormData({
      name: material.name,
      categoryId: material.categoryId,
      unit: material.unit,
      cost: material.cost,
      thicknessMin: material.thicknessMin || 0,
      thicknessMax: material.thicknessMax || 0,
      color: material.color || '#000000',
      supplier: material.supplier || '',
      image: material.image || '',
    });
    setImagePreview(material.image || null);
    setEditingId(material.id);
    setShowAddForm(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay">
        <motion.div 
          className="modal-content catalog-modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <div className="modal-header">
            <div className="title-with-icon">
              <BookOpen size={24} className="accent-icon" />
              <h2>Catálogo de Materiales</h2>
            </div>
            <button className="close-button" onClick={onClose}><X /></button>
          </div>

          <div className="catalog-layout">
            <div className="catalog-sidebar">
              <div className="search-box">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar material..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="category-filters">
                <button 
                  className={`filter-btn ${activeCategoryId === '' ? 'active' : ''}`}
                  onClick={() => setActiveCategoryId('')}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    className={`filter-btn ${activeCategoryId === cat.id ? 'active' : ''}`}
                    onClick={() => setActiveCategoryId(cat.id)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="sidebar-footer">
                <button className="cta-button" onClick={() => setShowAddForm(true)}>
                  <Plus size={18} /> Nuevo Material
                </button>
              </div>
            </div>

            <div className="catalog-main">
              {showAddForm ? (
                <motion.div 
                  className="material-form-container"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <form onSubmit={handleSubmit} className="material-form">
                    <div className="form-header">
                      <h3>{editingId ? 'Editar Material' : 'Nuevo Material'}</h3>
                      <button type="button" className="text-btn" onClick={() => setShowAddForm(false)}>Cancelar</button>
                    </div>
                    
                    <div className="form-grid">
                      <div className="form-group full">
                        <label>Imagen del Material</label>
                        <div 
                          className="image-upload-area material-mini-upload"
                          onClick={() => document.getElementById('mat-image-input')?.click()}
                        >
                          {imagePreview ? (
                            <img src={imagePreview} alt="Vista previa" className="image-preview" />
                          ) : (
                            <div className="upload-placeholder">
                              <Plus size={24} />
                              <span>Agregar Foto</span>
                            </div>
                          )}
                          <input
                            id="mat-image-input"
                            type="file"
                            onChange={handleImageChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                          />
                        </div>
                      </div>
                      <div className="form-group full">
                        <label>Nombre del Material</label>
                        <input 
                          required
                          type="text" 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>Categoría</label>
                        <select 
                          required
                          value={formData.categoryId}
                          onChange={e => setFormData({...formData, categoryId: e.target.value})}
                        >
                          <option value="">Seleccionar...</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Unidad</label>
                        <select 
                          value={formData.unit}
                          onChange={e => setFormData({...formData, unit: e.target.value as UnitOfMeasure})}
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Costo por Unidad</label>
                        <div className="input-with-label">
                          <span>$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={formData.cost}
                            onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Proveedor</label>
                        <input 
                          type="text" 
                          value={formData.supplier}
                          onChange={e => setFormData({...formData, supplier: e.target.value})}
                        />
                      </div>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="cta-button submit-btn" disabled={isUploading}>
                      {isUploading ? <span className="spinner"></span> : (editingId ? 'Guardar Cambios' : 'Crear Material')}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <div className="materials-grid">
                  {filteredMaterials.map(mat => (
                    <div 
                      key={mat.id} 
                      className="material-card"
                      onClick={() => onSelect?.(mat)}
                      style={{ cursor: onSelect ? 'pointer' : 'default' }}
                    >
                      <div className="mat-card-header">
                        <div className="mat-type">
                          <Tag size={14} />
                          {categories.find(c => c.id === mat.categoryId)?.name}
                        </div>
                        <div className="mat-actions" onClick={e => e.stopPropagation()}>
                          <button className="icon-btn" onClick={() => handleEdit(mat)}><Edit2 size={16} /></button>
                          <button className="icon-btn delete" onClick={() => deleteMaterial(mat.id)}><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <h4>{mat.name}</h4>
                      <div className="mat-stats">
                        <div className="stat">
                          <span className="label">Costo</span>
                          <span className="value">${mat.cost.toFixed(2)} / {mat.unit}</span>
                        </div>
                        <div className="stat">
                          <span className="label">Última act.</span>
                          <span className="value">{new Date(mat.lastUpdated).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <div className="empty-state">
                      <Search size={48} />
                      <p>No se encontraron materiales</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
