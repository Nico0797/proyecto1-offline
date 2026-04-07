import React from 'react';
import { Reminder, reminderService } from '../../services/reminderService';
import { CheckCircle, Clock, Pin, Trash2, Archive, RotateCcw, Edit2, Tag } from 'lucide-react';
import { Button } from '../ui/Button';

interface ReminderCardProps {
  reminder: Reminder;
  onUpdate: () => void;
  onEdit: (reminder: Reminder) => void;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({ reminder, onUpdate, onEdit }) => {
  const { id, title, content, priority, dueDate, dueTime, tags, status, pinned } = reminder;
  const isCompleted = status === 'completed';

  const priorityColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  const handleToggleComplete = async () => {
    await reminderService.toggleComplete(reminder.businessId, id, status);
    onUpdate();
  };

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await reminderService.togglePin(reminder.businessId, id, pinned);
    onUpdate();
  };

  const handleArchive = async () => {
    await reminderService.archive(reminder.businessId, id);
    onUpdate();
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de eliminar este recordatorio?')) {
      await reminderService.delete(reminder.businessId, id);
      onUpdate();
    }
  };

  const handleRestore = async () => {
    await reminderService.restore(reminder.businessId, id);
    onUpdate();
  };

  return (
    <div className={`
      relative group p-4 rounded-xl border transition-all duration-300
      ${isCompleted ? 'bg-gray-800/30 border-gray-700/50 opacity-75' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'}
      ${pinned ? 'border-l-4 border-l-blue-500 dark:border-l-blue-400' : ''}
    `}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button 
            onClick={handleToggleComplete}
            className={`p-1 rounded-full transition-colors ${isCompleted ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <CheckCircle className={`w-5 h-5 ${isCompleted ? 'fill-current' : ''}`} />
          </button>
          <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${isCompleted ? 'line-through text-gray-500' : ''}`}>
            {title}
          </h3>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={handleTogglePin}
            className={`p-1.5 rounded-lg transition-colors ${pinned ? 'text-blue-500 bg-blue-500/10 opacity-100' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title={pinned ? "Desfijar" : "Fijar"}
          >
            <Pin className={`w-4 h-4 ${pinned ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={() => onEdit(reminder)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {status !== 'archived' && (
            <button 
              onClick={handleArchive}
              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Archivar"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="pl-8 mb-3">
        {content && (
          <p className={`text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-2 ${isCompleted ? 'text-gray-500' : ''}`}>
            {content}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <Tag className="w-3 h-3 mr-1 opacity-50" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pl-8 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[priority]}`}>
            {priority === 'high' ? 'Alta' : priority === 'medium' ? 'Media' : 'Baja'}
          </span>
          {(dueDate || dueTime) && (
            <div className={`flex items-center text-xs ${isCompleted ? 'text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
              <Clock className="w-3 h-3 mr-1" />
              {dueDate && new Date(dueDate).toLocaleDateString()} {dueTime}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
            {reminder.created_by_name && (
                <div className="text-[10px] text-gray-400 flex items-center gap-1" title={reminder.created_by_role}>
                    <span>Por:</span>
                    <span className="font-medium text-gray-600 dark:text-gray-300 truncate max-w-[80px]">
                        {reminder.created_by_name.split(' ')[0]}
                    </span>
                </div>
            )}
            
            {status === 'archived' && (
            <Button variant="secondary" size="sm" onClick={handleRestore} className="h-6 text-xs px-2 ml-2">
                <RotateCcw className="w-3 h-3 mr-1" /> Restaurar
            </Button>
            )}
        </div>
      </div>
    </div>
  );
};
