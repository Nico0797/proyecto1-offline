import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { debtTermsStore } from '../../utils/debtTermsStore';

interface EditDebtTermModalProps {
    isOpen: boolean;
    onClose: () => void;
    saleId: number;
    currentTermDays?: number;
    currentDueDate?: string;
    onSave: () => void;
}

export const EditDebtTermModal: React.FC<EditDebtTermModalProps> = ({ 
    isOpen, 
    onClose, 
    saleId, 
    currentTermDays = 15,
    currentDueDate,
    onSave
}) => {
    const [termDays, setTermDays] = useState(currentTermDays);
    const [useCustomDate, setUseCustomDate] = useState(false);
    const [customDate, setCustomDate] = useState(currentDueDate || '');

    const handleSave = () => {
        if (useCustomDate && customDate) {
            debtTermsStore.setDueDate(saleId, customDate);
        } else {
            debtTermsStore.setTerm(saleId, termDays);
        }
        onSave();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Plazo de Pago">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Plazo en días
                    </label>
                    <div className="flex gap-2 mb-2">
                        <button 
                            onClick={() => { setTermDays(3); setUseCustomDate(false); }}
                            className={`px-3 py-1 text-sm rounded-md border ${termDays === 3 && !useCustomDate ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}
                        >
                            3 días
                        </button>
                        <button 
                            onClick={() => { setTermDays(7); setUseCustomDate(false); }}
                            className={`px-3 py-1 text-sm rounded-md border ${termDays === 7 && !useCustomDate ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}
                        >
                            7 días
                        </button>
                        <button 
                            onClick={() => { setTermDays(15); setUseCustomDate(false); }}
                            className={`px-3 py-1 text-sm rounded-md border ${termDays === 15 && !useCustomDate ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}
                        >
                            15 días
                        </button>
                        <button 
                            onClick={() => { setTermDays(30); setUseCustomDate(false); }}
                            className={`px-3 py-1 text-sm rounded-md border ${termDays === 30 && !useCustomDate ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}
                        >
                            30 días
                        </button>
                    </div>
                    <Input 
                        type="number" 
                        value={termDays} 
                        onChange={(e) => { setTermDays(Number(e.target.value)); setUseCustomDate(false); }}
                        disabled={useCustomDate}
                        className={useCustomDate ? 'opacity-50' : ''}
                    />
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">O elegir fecha exacta</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fecha de Vencimiento
                    </label>
                    <div className="flex gap-2">
                        <Input 
                            type="date" 
                            value={customDate} 
                            onChange={(e) => { setCustomDate(e.target.value); setUseCustomDate(true); }}
                            className={!useCustomDate ? 'opacity-70' : ''}
                        />
                        {useCustomDate && (
                            <Button 
                                variant="secondary" 
                                onClick={() => { setUseCustomDate(false); setCustomDate(''); }}
                                size="sm"
                            >
                                Cancelar
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                </div>
            </div>
        </Modal>
    );
};
