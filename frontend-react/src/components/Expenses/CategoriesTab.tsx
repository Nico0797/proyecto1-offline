import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Trash2, Plus, Tag } from 'lucide-react';

interface CategoriesTabProps {
  categories: string[];
  onAddCategory: (category: string) => void;
  onRemoveCategory: (category: string) => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ categories, onAddCategory, onRemoveCategory }) => {
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = () => {
    if (newCategory.trim()) {
      onAddCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
           <Tag className="w-5 h-5 text-blue-500" /> Gestionar Categorías
        </h3>
        
        <div className="flex gap-2 mb-6">
           <Input 
              placeholder="Nueva categoría..." 
              value={newCategory} 
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
           />
           <Button onClick={handleAdd} disabled={!newCategory.trim()}>
              <Plus className="w-4 h-4 mr-2" /> Agregar
           </Button>
        </div>

        <div className="space-y-2">
           {categories.map((category) => (
               <div key={category} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                   <span className="font-medium text-gray-900 dark:text-white">{category}</span>
                   <button 
                      onClick={() => onRemoveCategory(category)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Eliminar"
                   >
                       <Trash2 className="w-4 h-4" />
                   </button>
               </div>
           ))}
           {categories.length === 0 && (
               <div className="text-center text-gray-500 py-4 italic">No hay categorías personalizadas.</div>
           )}
        </div>
      </div>
    </div>
  );
};
