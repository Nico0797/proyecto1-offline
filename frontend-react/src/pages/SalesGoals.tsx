import { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Target, Trophy, Calendar, CheckCircle, Archive, TrendingUp, AlertCircle, Clock, Plus, ArrowRight } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SalesGoal {
  id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'archived';
  progress_pct: number;
}

export const SalesGoals = () => {
  const { activeBusiness } = useBusinessStore();
  const [loading, setLoading] = useState(false);
  const [isProLocked, setIsProLocked] = useState(false);
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'archived'>('active');
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SalesGoal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    target_amount: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
  });

  const loadGoals = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    setIsProLocked(false);
    try {
      const res = await api.get(`/businesses/${activeBusiness.id}/sales-goals`);
      setGoals(res.data.sales_goals || []);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.data?.code === 'PRO_REQUIRED') {
        setIsProLocked(true);
      } else {
        console.error('Error cargando metas', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeBusiness) {
      loadGoals();
    }
  }, [activeBusiness]);

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        title: editingGoal.title,
        target_amount: editingGoal.target_amount.toString(),
        start_date: editingGoal.start_date.split('T')[0],
        end_date: editingGoal.end_date.split('T')[0],
      });
    } else {
      setFormData({
        title: '',
        target_amount: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      });
    }
  }, [editingGoal, isModalOpen]);

  const handleSubmit = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        target_amount: parseFloat(formData.target_amount),
        start_date: formData.start_date,
        end_date: formData.end_date,
      };

      if (editingGoal) {
        const res = await api.put(`/businesses/${activeBusiness.id}/sales-goals/${editingGoal.id}`, payload);
        const updatedGoal = res.data.sales_goal;
        setGoals(goals.map(g => g.id === editingGoal.id ? { ...g, ...updatedGoal } : g));
      } else {
        const res = await api.post(`/businesses/${activeBusiness.id}/sales-goals`, payload);
        const newGoal = res.data.sales_goal;
        setGoals([...goals, newGoal]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error guardando meta', err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id: number) => {
    if (!activeBusiness) return;
    try {
      await api.post(`/businesses/${activeBusiness.id}/sales-goals/${id}/archive`, {});
      setGoals(goals.map(g => g.id === id ? { ...g, status: 'archived' } : g));
    } catch (err) {
      console.error("Error archiving goal", err);
    }
  };

  const calculateDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateDailyNeeded = (target: number, current: number, daysLeft: number) => {
    if (daysLeft <= 0) return 0;
    const remaining = target - current;
    return remaining > 0 ? remaining / daysLeft : 0;
  };

  if (isProLocked) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center max-w-2xl w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />
          <div className="bg-yellow-500/10 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center animate-pulse">
            <Trophy className="w-12 h-12 text-yellow-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Desbloquea Metas Pro</h2>
          <p className="text-gray-400 mb-8 text-lg leading-relaxed">
            Define objetivos claros, monitorea tu progreso en tiempo real y celebra tus logros.
            <br />
            Las empresas que establecen metas crecen un <span className="text-yellow-400 font-bold">30% más rápido</span>.
          </p>
          <Button onClick={() => (window.location.href = '/settings')} className="bg-gradient-to-r from-yellow-500 to-orange-500 border-none px-8 py-4 text-lg font-bold shadow-lg hover:shadow-yellow-500/20 transform hover:scale-105 transition-all">
            Actualizar a Pro ahora
          </Button>
        </div>
      </div>
    );
  }

  const filteredGoals = goals.filter(g => g.status === activeTab);
  const totalTarget = goals.filter(g => g.status === 'active').reduce((acc, curr) => acc + curr.target_amount, 0);
  const totalCurrent = goals.filter(g => g.status === 'active').reduce((acc, curr) => acc + curr.current_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="w-10 h-10 text-blue-500" />
            Metas de Ventas
          </h1>
          <p className="text-gray-400 mt-1">Monitorea y alcanza tus objetivos financieros</p>
        </div>
        <Button 
          onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Meta
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">Progreso Global</p>
              <h3 className="text-2xl font-bold text-white mt-1">{Math.round(overallProgress)}%</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">Meta Total Activa</p>
              <h3 className="text-2xl font-bold text-white mt-1">${totalTarget.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Target className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Logrado: <span className="text-green-400 font-medium">${totalCurrent.toLocaleString()}</span>
          </p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">Metas Activas</p>
              <h3 className="text-2xl font-bold text-white mt-1">{goals.filter(g => g.status === 'active').length}</h3>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Trophy className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Completadas: <span className="text-purple-400 font-medium">{goals.filter(g => g.status === 'completed').length}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-800/50 p-1 rounded-xl w-fit border border-gray-700/50">
        {(['active', 'completed', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab 
                ? 'bg-gray-700 text-white shadow-md' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
          >
            {tab === 'active' ? 'Activas' : tab === 'completed' ? 'Completadas' : 'Archivadas'}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredGoals.map((goal) => {
          const daysLeft = calculateDaysLeft(goal.end_date);
          const dailyNeeded = calculateDailyNeeded(goal.target_amount || 0, goal.current_amount || 0, daysLeft);

          return (
            <div key={goal.id} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-600 transition-colors shadow-lg">
              {goal.status === 'completed' && (
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <Trophy className="w-32 h-32 text-yellow-500 transform rotate-12" />
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{goal.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(goal.start_date).toLocaleDateString()} - {new Date(goal.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
                {goal.status === 'completed' ? (
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 border border-green-500/20">
                    <CheckCircle className="w-3 h-3" />
                    Completada
                  </span>
                ) : (
                  <span className={`bg-gray-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${daysLeft <= 3 ? 'text-red-400' : 'text-gray-300'}`}>
                    <Clock className="w-3 h-3" />
                    {daysLeft} días restantes
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-center">
                {/* Chart */}
                <div className="relative w-32 h-32 flex-shrink-0">
                  <Doughnut
                    data={{
                      labels: ['Completado', 'Restante'],
                      datasets: [{
                        data: [goal.current_amount || 0, Math.max(0, (goal.target_amount || 0) - (goal.current_amount || 0))],
                        backgroundColor: [
                          (goal.progress_pct || 0) >= 100 ? '#22c55e' : '#3b82f6',
                          '#1f2937' // gray-800
                        ],
                        borderWidth: 0,
                      }]
                    }}
                    options={{
                      cutout: '75%',
                      plugins: { legend: { display: false }, tooltip: { enabled: false } }
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-bold text-white">{Math.round(goal.progress_pct || 0)}%</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Progreso actual</span>
                      <span className="text-white font-bold">${(goal.current_amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Meta total</span>
                      <span className="text-gray-300">${(goal.target_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {goal.status === 'active' && (
                    <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600/50">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-medium text-blue-400">Ritmo diario necesario</span>
                      </div>
                      <p className="text-lg font-bold text-white">
                        ${Math.round(dailyNeeded).toLocaleString()}
                        <span className="text-xs font-normal text-gray-500 ml-1">/ día</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 mt-4 border-t border-gray-700">
                {goal.status === 'completed' && activeTab !== 'archived' && (
                  <Button variant="secondary" size="sm" onClick={() => handleArchive(goal.id)} className="hover:bg-gray-700 text-gray-300">
                    <Archive className="w-4 h-4 mr-1" /> Archivar
                  </Button>
                )}
                 <Button variant="secondary" size="sm" onClick={() => { setEditingGoal(goal); setIsModalOpen(true); }} className="hover:bg-gray-700 text-gray-300">
                    Editar
                </Button>
              </div>

              {/* Celebration Overlay */}
              {(goal.progress_pct || 0) >= 100 && goal.status === 'active' && (
                <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center flex-col text-center p-6 animate-in fade-in duration-500 z-10">
                  <div className="bg-yellow-500/20 p-4 rounded-full mb-4 animate-bounce">
                    <Trophy className="w-16 h-16 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">¡Meta Alcanzada!</h3>
                  <p className="text-gray-300 mb-6">Has superado tu objetivo de ${(goal.target_amount || 0).toLocaleString()}.</p>
                  <Button onClick={() => handleArchive(goal.id)} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold px-6">
                    Celebrar y Archivar
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {filteredGoals.length === 0 && (
          <div className="col-span-full py-16 text-center bg-gray-800/50 border border-gray-700 border-dashed rounded-2xl">
            <div className="bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No hay metas {activeTab === 'active' ? 'activas' : 'en esta sección'}</h3>
            <p className="text-gray-400 max-w-sm mx-auto mb-6">
              {activeTab === 'active' 
                ? 'Define un nuevo objetivo para motivar tus ventas y seguir tu crecimiento.' 
                : 'Tus metas cumplidas o archivadas aparecerán aquí.'}
            </p>
            {activeTab === 'active' && (
              <Button onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}>
                Crear mi primera meta
              </Button>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGoal ? 'Editar Meta' : 'Nueva Meta de Ventas'}
      >
        <div className="space-y-5">
          <Input 
            label="Título de la Meta" 
            value={formData.title} 
            onChange={(e) => setFormData({...formData, title: e.target.value})} 
            placeholder="Ej: Ventas Marzo 2024" 
            className="bg-gray-700 border-gray-600 text-white"
          />
          
          <div className="relative">
            <Input 
              label="Monto Objetivo ($)" 
              type="number" 
              value={formData.target_amount} 
              onChange={(e) => setFormData({...formData, target_amount: e.target.value})} 
              placeholder="0.00" 
              className="bg-gray-700 border-gray-600 text-white pl-8"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Fecha Inicio" 
              type="date" 
              value={formData.start_date} 
              onChange={(e) => setFormData({...formData, start_date: e.target.value})} 
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Input 
              label="Fecha Fin" 
              type="date" 
              value={formData.end_date} 
              onChange={(e) => setFormData({...formData, end_date: e.target.value})} 
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-300">
              Te notificaremos cuando estés cerca de cumplir tu meta o si necesitas acelerar el ritmo.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-700">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="hover:bg-gray-700 text-gray-300">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Guardando...' : editingGoal ? 'Actualizar Meta' : 'Crear Meta'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
