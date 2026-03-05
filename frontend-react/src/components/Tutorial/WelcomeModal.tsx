import { useEffect, useState } from 'react';
import { useTutorialStore } from '../../store/tutorialStore';
import { GraduationCap, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WelcomeModal = () => {
  const { hasSeenWelcome, setHasSeenWelcome, startTutorial, isTutorialActive } = useTutorialStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Mostrar solo si no hay tutorial activo
    if (!hasSeenWelcome && !isTutorialActive) setOpen(true);
  }, [hasSeenWelcome]);

  if (!open) return null;

  const start = () => {
    setHasSeenWelcome(true);
    navigate('/dashboard');
    startTutorial('dashboard');
    setOpen(false);
  };

  const dismiss = () => {
    setHasSeenWelcome(true);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full maxWidth max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6 z-10">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-6 h-6 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">Bienvenido a EnCaja</h3>
        </div>
        <p className="text-sm text-gray-300 mb-6">¿Quieres hacer un recorrido rápido por las funciones principales?</p>
        <div className="flex justify-end gap-2">
          <button onClick={dismiss} className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600">Más tarde</button>
          <button onClick={start} className="px-4 py-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 flex items-center gap-2"><Play className="w-4 h-4" /> Empezar</button>
        </div>
      </div>
    </div>
  );
};
