import { useState, useEffect, useMemo } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { reminderService, Reminder, CreateReminderDTO, ReminderStatus, Priority } from '../../services/reminderService';
import { ReminderCard } from '../Reminders/ReminderCard';
import { ReminderModal } from '../Reminders/ReminderModal';
import { Button } from '../ui/Button';
import { Plus, Search, Filter, Bell, List, CheckSquare, Archive } from 'lucide-react';
import api from '../../services/api';

export const RemindersTab = () => {
  const { activeBusiness } = useBusinessStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Filters
  const [statusTab, setStatusTab] = useState<ReminderStatus>('active');
  const [searchText, setSearchText] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  useEffect(() => {
    if (activeBusiness) {
      loadReminders();
    }
  }, [activeBusiness]);

  const loadReminders = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    
    // Load from local storage
    let localReminders = reminderService.list(activeBusiness.id);

    // Import legacy quick-notes if local storage is empty
    if (localReminders.length === 0) {
      try {
        const res = await api.get(`/businesses/${activeBusiness.id}/quick-notes`);
        const legacyNotes = res.data.notes || [];
        
        if (legacyNotes.length > 0) {
          legacyNotes.forEach((note: any) => {
            reminderService.create(activeBusiness.id, {
              title: 'Nota importada',
              content: note.note,
              priority: 'medium',
              tags: ['importado']
            });
          });
          // Reload from local storage after import
          localReminders = reminderService.list(activeBusiness.id);
        }
      } catch (err) {
        console.error("Error importing legacy notes", err);
      }
    }

    setReminders(localReminders);
    setLoading(false);
  };

  const handleSave = (data: CreateReminderDTO) => {
    if (!activeBusiness) return;
    
    if (editingReminder) {
      reminderService.update(activeBusiness.id, editingReminder.id, data);
    } else {
      reminderService.create(activeBusiness.id, data);
    }
    
    setEditingReminder(null);
    loadReminders(); // Refresh list
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  };

  const filteredReminders = useMemo(() => {
    return reminders
      .filter(r => r.status === statusTab)
      .filter(r => {
        if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
        if (searchText) {
          const lower = searchText.toLowerCase();
          return r.title.toLowerCase().includes(lower) || 
                 r.content.toLowerCase().includes(lower) || 
                 r.tags.some(t => t.toLowerCase().includes(lower));
        }
        return true;
      })
      .sort((a, b) => {
        // 1. Pinned first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        
        // 2. Due Date (earliest first) - considering nulls last
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;

        // 3. Created At (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [reminders, statusTab, searchText, priorityFilter]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando recordatorios...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por título, contenido o etiqueta..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 dark:text-white"
            />
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="all">Todas las prioridades</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
        </div>

        <Button onClick={() => { setEditingReminder(null); setIsModalOpen(true); }} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Recordatorio
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'active', label: 'Activos', icon: List },
          { id: 'completed', label: 'Completados', icon: CheckSquare },
          { id: 'archived', label: 'Archivados', icon: Archive },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusTab(tab.id as ReminderStatus)}
            className={`
              flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${statusTab === tab.id 
                ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs">
              {reminders.filter(r => r.status === tab.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredReminders.map(reminder => (
          <ReminderCard 
            key={reminder.id} 
            reminder={reminder} 
            onUpdate={loadReminders} 
            onEdit={handleEdit}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredReminders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No hay recordatorios {statusTab === 'active' ? 'activos' : statusTab === 'completed' ? 'completados' : 'archivados'}
          </h3>
          <p className="text-gray-500 text-sm mb-6 max-w-xs">
            {statusTab === 'active' 
              ? 'Organiza tu día creando notas y tareas pendientes.' 
              : 'Aquí verás el historial de tus tareas.'}
          </p>
          {statusTab === 'active' && (
            <Button onClick={() => { setEditingReminder(null); setIsModalOpen(true); }} variant="secondary">
              Crear el primero
            </Button>
          )}
        </div>
      )}

      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingReminder}
      />
    </div>
  );
};
