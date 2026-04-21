import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '../types';
import { ProductCard } from './ProductCard';
import { PackageOpen } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  onDelete: (id: string) => void;
  onEdit: (product: Product) => void;
  onAddClick: () => void;
  onProductClick: (product: Product) => void;
}

export function ProductGrid({ products, onDelete, onEdit, onAddClick, onProductClick }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="empty-state-content"
        >
          <PackageOpen size={64} className="empty-icon" />
          <h2>El catálogo está vacío</h2>
          <p>Aún no has añadido ningún producto a tu catálogo.</p>
          <button className="cta-button" onClick={onAddClick}>
            Agregar mi primer producto
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="product-carousel-wrapper">
      <div className="carousel-container">
        <AnimatePresence mode="popLayout">
          {products.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onDelete={onDelete} 
              onEdit={onEdit}
              onClick={onProductClick}
            />
          ))}
        </AnimatePresence>
      </div>
      <div className="carousel-hint">
        <span>Próximas piezas</span>
        <div className="hint-arrow" />
      </div>
    </div>
  );
}
