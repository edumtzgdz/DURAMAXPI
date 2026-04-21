import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, Plus } from 'lucide-react';
import { useProducts } from './hooks/useProducts';
import { Logo } from './components/Logo';
import { ProductGrid } from './components/ProductGrid';
import { AddProductModal } from './components/AddProductModal';
import { ProductDetailsModal } from './components/ProductDetailsModal';
import { MaterialsCatalogModal } from './components/MaterialsCatalogModal';
import { StylesManagementModal } from './components/StylesManagementModal';
import type { Product, Material } from './types';
import './App.css';

function App() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isStylesModalOpen, setIsStylesModalOpen] = useState(false);
  const [pendingMaterial, setPendingMaterial] = useState<Partial<Material> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.id.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (productData: { id?: string; name: string; image: string }) => {
    if (productData.id) {
      updateProduct(productData.id, { name: productData.name, image: productData.image });
    } else {
      addProduct({ name: productData.name, image: productData.image });
    }
  };

  return (
    <div className="app-container">
      <header className="fixed-header glass-panel">
        <motion.div 
          className="logo-container"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Logo className="logo-svg" width={48} height={28} />
        </motion.div>

        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Buscar modelos, materiales..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="header-actions">
          <button className="catalog-button" onClick={() => setIsStylesModalOpen(true)} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-color)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
            <span className="button-text">ESTILOS</span>
          </button>
          <button className="catalog-button" onClick={() => setIsCatalogOpen(true)}>
            <BookOpen size={18} />
            <span className="button-text">CATÁLOGO DE MATERIALES</span>
          </button>
          <button className="cta-button pulse-effect" onClick={handleOpenAddModal}>
            <Plus size={18} />
            <span className="button-text">Nuevo Producto</span>
          </button>
        </div>
      </header>

      <main className="main-viewport">
        <section className="hero-section">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="section-title"
          >
            Nuestras Colecciones
          </motion.h2>
          <ProductGrid 
            products={filteredProducts} 
            onDelete={deleteProduct} 
            onEdit={handleOpenEditModal}
            onAddClick={handleOpenAddModal} 
            onProductClick={setSelectedProduct}
          />
        </section>
      </main>

      <AddProductModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={handleSaveProduct} 
        initialData={editingProduct}
      />

      <MaterialsCatalogModal 
        isOpen={isCatalogOpen} 
        onClose={() => {
          setIsCatalogOpen(false);
          setPendingMaterial(null);
        }} 
        initialData={pendingMaterial}
      />

      <StylesManagementModal 
        isOpen={isStylesModalOpen}
        onClose={() => setIsStylesModalOpen(false)}
      />

      <ProductDetailsModal
        product={products.find(p => p.id === selectedProduct?.id) || null}
        onClose={() => setSelectedProduct(null)}
        onUpdate={updateProduct}
        onOpenCatalog={(initialData) => {
          if (initialData) {
            setPendingMaterial(initialData);
          }
          setIsCatalogOpen(true);
        }}
      />
    </div>
  );
}

export default App;
