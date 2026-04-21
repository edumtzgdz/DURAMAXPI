import { motion } from 'framer-motion';
import type { Product } from '../types';
import { Trash2, Edit3 } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onDelete: (id: string) => void;
  onEdit: (product: Product) => void;
  onClick: (product: Product) => void;
}

export function ProductCard({ product, onDelete, onEdit, onClick }: ProductCardProps) {
  return (
    <motion.div 
      className="product-card carousel-item"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="card-inner glass-panel" onClick={() => onClick(product)}>
        <div className="product-image-container">
          <img src={product.image} alt={product.name} className="product-image" loading="lazy" />
          <div className="card-overlay">
            <div className="card-actions">
              <button 
                className="action-button edit-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(product);
                }}
                title="Editar producto"
              >
                <Edit3 size={18} />
              </button>
              <button 
                className="action-button delete-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(product.id);
                }}
                title="Eliminar producto"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <div className="card-badge">PREMIUM</div>
        </div>
      </div>
    </motion.div>
  );
}
