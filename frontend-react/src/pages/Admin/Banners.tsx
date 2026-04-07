import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Link as LinkIcon } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../utils/cn';

interface Banner {
  id: number;
  title: string;
  image_url: string;
  link?: string;
  active: boolean;
  order: number;
}

export const AdminBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  
  const [formData, setFormData] = useState<Partial<Banner>>({
    title: '',
    image_url: '',
    link: '',
    active: true,
    order: 0
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/banners');
      setBanners(res.data.banners || []);
    } catch (err) {
      console.error("Error fetching banners", err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleOpenModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData(banner);
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        image_url: '',
        link: '',
        active: true,
        order: banners.length + 1
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingBanner) {
        await api.put(`/admin/banners/${editingBanner.id}`, formData);
      } else {
        await api.post('/admin/banners', formData);
      }
      setIsModalOpen(false);
      fetchBanners();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar banner');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este banner?')) {
      try {
        await api.delete(`/admin/banners/${id}`);
        fetchBanners();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Error al eliminar banner');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Banners y Contenido</h1>
          <p className="text-slate-400 text-sm">Gestiona los banners de la página principal</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={18} /> Nuevo Banner
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
            <p className="text-lg mb-2">No hay banners configurados</p>
            <p className="text-sm">Crea tu primer banner usando el botón de arriba</p>
          </div>
        ) : (
          banners.map((banner) => (
            <div key={banner.id} className="bg-slate-800 border border-white/10 rounded-xl overflow-hidden group">
              <div className="relative h-48 bg-slate-900">
                <img 
                  src={banner.image_url} 
                  alt={banner.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Error+Imagen';
                  }}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-bold",
                    banner.active ? "bg-green-500 text-white" : "bg-red-500 text-white"
                  )}>
                    {banner.active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={() => handleOpenModal(banner)}
                    className="p-2 bg-white rounded-full text-slate-900 hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-lg">{banner.title}</h3>
                  <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">Orden: {banner.order}</span>
                </div>
                {banner.link && (
                  <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
                    <LinkIcon size={14} />
                    <span className="truncate">{banner.link}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBanner ? "Editar Banner" : "Nuevo Banner"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Título"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen URL</label>
            <div className="flex gap-2">
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                placeholder="https://..."
                required
                className="flex-1"
              />
            </div>
            {formData.image_url && (
              <div className="mt-2 h-32 rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
                <img 
                  src={formData.image_url} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                />
              </div>
            )}
          </div>

          <Input
            label="Enlace (Opcional)"
            value={formData.link}
            onChange={(e) => setFormData({...formData, link: e.target.value})}
            placeholder="/ofertas"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Orden"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
              <select
                value={String(formData.active)}
                onChange={(e) => setFormData({...formData, active: e.target.value === 'true'})}
                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit">
              {editingBanner ? 'Guardar Cambios' : 'Crear Banner'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
