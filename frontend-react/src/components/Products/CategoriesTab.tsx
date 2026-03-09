import React, { useState } from 'react';
import { useCategoryStore } from './categoryStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';

export const CategoriesTab: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategoryStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Estados para formulario
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('bg-blue-500');

  const colors = [
    'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'
  ];

  const handleStartAdd = () => {
    setFormName('');
    setFormColor('bg-blue-500');
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (cat: { id: string, name: string, color: string }) => {
    setFormName(cat.name);
    setFormColor(cat.color);
    setEditingId(cat.id);
    setIsAdding(false);
  };

  const handleSave = () => {
    if (!formName.trim()) return;

    if (editingId) {
        updateCategory(editingId, formName, formColor);
        setEditingId(null);
    } else {
        addCategory(formName, formColor);
        setIsAdding(false);
    }
    setFormName('');
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormName('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Gestión de Categorías</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Organiza tus productos en categorías locales.</p>
        </div>
        {!isAdding && !editingId && (
            <Button onClick={handleStartAdd}>
                <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
            </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="flex-1 w-full">
                    <Input 
                        label="Nombre" 
                        value={formName} 
                        onChange={(e) => setFormName(e.target.value)} 
                        placeholder="Ej. Bebidas, Carnes..."
                        autoFocus
                    />
                </div>
                <div className="w-full md:w-auto">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                    <div className="flex gap-2">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setFormColor(c)}
                                className={`w-8 h-8 rounded-full ${c} transition-transform ${formColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <Button onClick={handleSave} className="flex-1 md:flex-none">
                        <Check className="w-4 h-4 mr-2" /> Guardar
                    </Button>
                    <Button variant="ghost" onClick={handleCancel} className="flex-1 md:flex-none">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 && !isAdding && (
            <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-dashed border-2 border-gray-200 dark:border-gray-700">
                <p>No tienes categorías creadas.</p>
            </div>
        )}
        
        {categories.map((cat) => (
            <div key={cat.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center group hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${cat.color}`} />
                    <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => handleStartEdit(cat)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => {
                            if(window.confirm('¿Eliminar esta categoría?')) deleteCategory(cat.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};
