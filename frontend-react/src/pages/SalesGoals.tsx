import { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Target, Trophy, Calendar, CheckCircle, Archive, TrendingUp, AlertCircle, Clock, Plus, ArrowRight, User, Filter, Trash2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { PageBody, PageHeader, PageHeaderActionButton, PageLayout, PageNotice, PageStack, PageSummary, PageToolbarCard } from '../components/Layout/PageLayout';
import { SwipePager } from '../components/ui/SwipePager';
import {
  MobileFilterDrawer,
  MobileHelpDisclosure,
  MobileSelectField,
  MobileSummaryDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { TeamMember } from '../types';
import { isOfflineProductMode } from '../runtime/runtimeMode';
import { nextLocalNumericId, readLocalCollection, writeLocalCollection } from '../services/offlineLocalData';

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
  user_id: number;
  user_name?: string;
}

const SALES_GOALS_COLLECTION = 'sales_goals';

const readLocalGoals = (businessId: number) => readLocalCollection<SalesGoal>(businessId, SALES_GOALS_COLLECTION);
const writeLocalGoals = (businessId: number, goals: SalesGoal[]) => writeLocalCollection(businessId, SALES_GOALS_COLLECTION, goals);

export const SalesGoals = () => {
  const { activeBusiness } = useBusinessStore();
  const { user } = useAuthStore();
  const offlineProductMode = isOfflineProductMode();
  const [loading, setLoading] = useState(false);
  const [isProLocked, setIsProLocked] = useState(false);
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'archived'>('active');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberFilter, setMemberFilter] = useState<string>('ALL');
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SalesGoal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    target_amount: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    assigned_user_id: '',
    viewers: [] as string[],
  });

  const permissions = activeBusiness?.permissions || [];
  const isOwner = activeBusiness?.role === 'PROPIETARIO' || activeBusiness?.role === 'Propietario';
  const canManage = offlineProductMode || isOwner || permissions.includes('sales.goals.manage') || permissions.includes('*');
  const canViewAll = offlineProductMode || isOwner || permissions.includes('sales.goals.view_all') || permissions.includes('*');

  const loadGoals = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    setIsProLocked(false);
    try {
      if (offlineProductMode) {
        setGoals(readLocalGoals(activeBusiness.id));
        setMembers([]);
        return;
      }

      const res = await api.get(`/businesses/${activeBusiness.id}/sales-goals`);
      setGoals(res.data.sales_goals || []);
      
      // Load members if has permission to see them or manage goals
      if (canManage || canViewAll) {
        try {
            const membersRes = await api.get(`/businesses/${activeBusiness.id}/team`);
            setMembers(membersRes.data.members || []);
        } catch (e) {
            console.error("Failed to load members", e);
        }
      }
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
  }, [activeBusiness, offlineProductMode]);

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        title: editingGoal.title,
        target_amount: editingGoal.target_amount.toString(),
        start_date: editingGoal.start_date.split('T')[0],
        end_date: editingGoal.end_date.split('T')[0],
        assigned_user_id: editingGoal.user_id.toString(),
        viewers: (editingGoal as any).viewers ? (editingGoal as any).viewers.map(String) : [],
      });
    } else {
      setFormData({
        title: '',
        target_amount: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        assigned_user_id: user?.id?.toString() || '',
        viewers: [],
      });
    }
  }, [editingGoal, isModalOpen, user]); // Added user to dependency array

  const handleSubmit = async () => {
    if (!activeBusiness) return;
    
    // Client-side validation
    if (!formData.title.trim()) {
        alert("El título de la meta es obligatorio");
        return;
    }
    if (!formData.start_date || !formData.end_date) {
        alert("Las fechas son obligatorias");
        return;
    }

    setLoading(true);
    try {
      if (offlineProductMode) {
        const currentGoals = readLocalGoals(activeBusiness.id);
        const targetAmount = parseFloat(formData.target_amount) || 0;
        const assignedUserId = Number(formData.assigned_user_id || user?.id || 0);
        const nextGoals = editingGoal
          ? currentGoals.map((goal) =>
              goal.id === editingGoal.id
                ? {
                    ...goal,
                    title: formData.title,
                    target_amount: targetAmount,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    user_id: assignedUserId,
                    user_name: user?.name || goal.user_name,
                    progress_pct: targetAmount > 0 ? ((goal.current_amount || 0) / targetAmount) * 100 : 0,
                  }
                : goal,
            )
          : [
              ...currentGoals,
              {
                id: nextLocalNumericId(currentGoals),
                title: formData.title,
                target_amount: targetAmount,
                current_amount: 0,
                start_date: formData.start_date,
                end_date: formData.end_date,
                status: 'active' as const,
                progress_pct: 0,
                user_id: assignedUserId,
                user_name: user?.name || 'Responsable',
              },
            ];

        writeLocalGoals(activeBusiness.id, nextGoals);
        setGoals(nextGoals);
        setIsModalOpen(false);
        return;
      }

      const payload = {
        title: formData.title,
        target_amount: parseFloat(formData.target_amount) || 0,
        start_date: formData.start_date,
        end_date: formData.end_date,
        assigned_user_id: formData.assigned_user_id ? formData.assigned_user_id : (user?.id || null),
        viewers: formData.viewers,
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
    } catch (err: any) {
      console.error('Error guardando meta', err);
      const errorMessage = err.response?.data?.error || 'Ocurrió un error al guardar la meta. Intente nuevamente.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id: number) => {
    if (!activeBusiness) return;
    if (!confirm('¿Seguro que deseas archivar esta meta?')) return;
    try {
      if (offlineProductMode) {
        const nextGoals = goals.map((goal) => (goal.id === id ? { ...goal, status: 'archived' as const } : goal));
        writeLocalGoals(activeBusiness.id, nextGoals);
        setGoals(nextGoals);
        return;
      }
      await api.put(`/businesses/${activeBusiness.id}/sales-goals/${id}`, { status: 'archived' });
      setGoals(goals.map(g => g.id === id ? { ...g, status: 'archived' } : g));
    } catch (err) {
      console.error('Error archivando meta', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!activeBusiness) return;
    if (!confirm('¿Seguro que deseas ELIMINAR permanentemente esta meta? Esta acción no se puede deshacer.')) return;
    try {
      if (offlineProductMode) {
        const nextGoals = goals.filter((goal) => goal.id !== id);
        writeLocalGoals(activeBusiness.id, nextGoals);
        setGoals(nextGoals);
        return;
      }
      await api.delete(`/businesses/${activeBusiness.id}/sales-goals/${id}`);
      setGoals(goals.filter(g => g.id !== id));
    } catch (err: any) {
      console.error('Error eliminando meta', err);
      alert(err.response?.data?.error || 'Error eliminando meta');
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

  if (isProLocked && !offlineProductMode) {
    return (
      <div className="app-canvas min-h-screen p-6 flex items-center justify-center">
        <div className="app-surface rounded-2xl p-8 text-center max-w-2xl w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />
          <div className="bg-yellow-500/10 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center animate-pulse">
            <Trophy className="w-12 h-12 text-yellow-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">No pudimos cargar las metas ahora mismo</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
            Define objetivos claros, monitorea tu progreso en tiempo real y celebra tus logros.
            <br />
            Las empresas que establecen metas crecen un <span className="text-yellow-400 font-bold">30% más rápido</span>.
          </p>
          <Button onClick={() => (window.location.href = '/settings')} className="bg-gradient-to-r from-yellow-500 to-orange-500 border-none px-8 py-4 text-lg font-bold shadow-lg hover:shadow-yellow-500/20 transform hover:scale-105 transition-all">
            Abrir configuracion
          </Button>
        </div>
      </div>
    );
  }

  const filteredGoals = goals.filter(g => {
    // Basic status filter
    const matchesStatus = g.status === activeTab;
    
    // Member filter
    const matchesMember = memberFilter === 'ALL' || g.user_id.toString() === memberFilter;
    
    return matchesStatus && matchesMember;
  });
  const totalTarget = goals.filter(g => g.status === 'active').reduce((acc, curr) => acc + curr.target_amount, 0);
  const totalCurrent = goals.filter(g => g.status === 'active').reduce((acc, curr) => acc + curr.current_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const hasMemberFilter = memberFilter !== 'ALL';
  const mobileFilterSummary = hasMemberFilter ? 'Filtrando por miembro' : `${filteredGoals.length} meta(s)`;
  const mobileGoalFilters = useMobileFilterDraft({
    value: { memberFilter },
    onApply: (nextValue) => setMemberFilter(nextValue.memberFilter),
    createEmptyValue: () => ({ memberFilter: 'ALL' }),
  });

  const goalsSummaryContent = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="app-stat-card rounded-xl p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Progreso Global</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{Math.round(overallProgress)}%</h3>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-2">
            <TrendingUp className="h-6 w-6 text-blue-400" />
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-1000"
            style={{ width: `${Math.min(overallProgress, 100)}%` }}
          />
        </div>
      </div>

      <div className="app-stat-card rounded-xl p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Meta Total Activa</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">${totalTarget.toLocaleString()}</h3>
          </div>
          <div className="rounded-lg bg-green-500/10 p-2">
            <Target className="h-6 w-6 text-green-400" />
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Logrado: <span className="font-medium text-green-400">${totalCurrent.toLocaleString()}</span>
        </p>
      </div>

      <div className="app-stat-card rounded-xl p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Metas Activas</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{goals.filter(g => g.status === 'active').length}</h3>
          </div>
          <div className="rounded-lg bg-purple-500/10 p-2">
            <Trophy className="h-6 w-6 text-purple-400" />
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Completadas: <span className="font-medium text-purple-400">{goals.filter(g => g.status === 'completed').length}</span>
        </p>
      </div>
    </div>
  );

  const goalsToolbarContent = (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1 text-sm text-gray-500 dark:text-gray-400">
        {filteredGoals.length} meta(s) en la vista actual
      </div>
      {!offlineProductMode && (canManage || canViewAll) && members.length > 0 && (
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Filter className="h-4 w-4 text-gray-400" />
          <MobileSelectField
            value={memberFilter}
            onChange={setMemberFilter}
            options={[
              { value: 'ALL', label: 'Todos los miembros' },
              ...members.map((m) => ({ value: m.user_id.toString(), label: m.user_name || m.user_email })),
            ]}
            placeholder="Miembro"
            sheetTitle="Filtrar por miembro"
            className="min-w-0 flex-1 lg:flex-none"
            selectClassName="w-full lg:min-w-[240px]"
          />
        </div>
      )}
    </div>
  );

  const mobileGoalsToolbarContent = (
    <div className="flex flex-col gap-3">
      <div className="min-w-0 text-sm text-gray-500 dark:text-gray-400">
        {filteredGoals.length} meta(s) en la vista actual
      </div>
      {!offlineProductMode && (canManage || canViewAll) && members.length > 0 ? (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <MobileSelectField
            value={mobileGoalFilters.draft.memberFilter}
            onChange={(value) => mobileGoalFilters.setDraft({ memberFilter: value })}
            options={[
              { value: 'ALL', label: 'Todos los miembros' },
              ...members.map((m) => ({ value: m.user_id.toString(), label: m.user_name || m.user_email })),
            ]}
            placeholder="Miembro"
            sheetTitle="Filtrar por miembro"
            className="min-w-0 flex-1"
            selectClassName="w-full"
          />
        </div>
      ) : null}
    </div>
  );

  const renderGoalsGrid = (status: 'active' | 'completed' | 'archived') => {
    const goalsForTab = goals.filter((g) => {
      const matchesStatus = g.status === status;
      const matchesMember = memberFilter === 'ALL' || g.user_id.toString() === memberFilter;
      return matchesStatus && matchesMember;
    });

    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {goalsForTab.map((goal) => {
          const daysLeft = calculateDaysLeft(goal.end_date);
          const dailyNeeded = calculateDailyNeeded(goal.target_amount || 0, goal.current_amount || 0, daysLeft);

          return (
            <div key={goal.id} className="app-surface relative overflow-hidden rounded-2xl p-6 shadow-lg transition-colors hover:border-gray-300 dark:hover:border-gray-600">
              {goal.status === 'completed' && (
                <div className="pointer-events-none absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                  <Trophy className="h-32 w-32 rotate-12 text-yellow-500" />
                </div>
              )}

              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">{goal.title}</h3>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(goal.start_date).toLocaleDateString()} - {new Date(goal.end_date).toLocaleDateString()}</span>
                    </div>
                    {goal.user_name && (
                      <div className="flex items-center gap-2 text-sm text-blue-400">
                        <User className="h-4 w-4" />
                        <span>{goal.user_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                {goal.status === 'completed' ? (
                  <span className="flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/20 px-3 py-1 text-xs font-bold uppercase text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    Completada
                  </span>
                ) : (
                  <span className={`app-chip flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${daysLeft <= 3 ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    <Clock className="h-3 w-3" />
                    {daysLeft} días restantes
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div className="relative h-32 w-32 flex-shrink-0">
                  <Doughnut
                    data={{
                      labels: ['Completado', 'Restante'],
                      datasets: [{
                        data: [goal.current_amount || 0, Math.max(0, (goal.target_amount || 0) - (goal.current_amount || 0))],
                        backgroundColor: [
                          (goal.progress_pct || 0) >= 100 ? '#22c55e' : '#3b82f6',
                          '#e5e7eb'
                        ],
                        borderWidth: 0,
                      }]
                    }}
                    options={{
                      cutout: '75%',
                      plugins: { legend: { display: false }, tooltip: { enabled: false } }
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(goal.progress_pct || 0)}%</span>
                  </div>
                </div>

                <div className="w-full flex-1 space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Progreso actual</span>
                      <span className="font-bold text-gray-900 dark:text-white">${(goal.current_amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Meta total</span>
                      <span className="text-gray-700 dark:text-gray-300">${(goal.target_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {goal.status === 'active' && (
                    <div className="app-muted-panel rounded-lg p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                        <span className="text-xs font-medium text-blue-400">Ritmo diario necesario</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        ${Math.round(dailyNeeded).toLocaleString()}
                        <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">/ día</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="app-divider mt-4 flex justify-end gap-2 border-t pt-4">
                {canManage && (
                  <>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => handleDelete(goal.id)} 
                      className="border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      title="Eliminar permanentemente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {status !== 'archived' && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleArchive(goal.id)} 
                        className="text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        title="Archivar"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}

                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => { setEditingGoal(goal); setIsModalOpen(true); }} 
                      className="text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Editar
                    </Button>
                  </>
                )}
              </div>

              {(goal.progress_pct || 0) >= 100 && goal.status === 'active' && (
                <div className="animate-in fade-in absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/90 p-6 text-center text-white backdrop-blur-sm duration-500">
                  <div className="mb-4 rounded-full bg-yellow-500/20 p-4 animate-bounce">
                    <Trophy className="h-16 w-16 text-yellow-500" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold">¡Meta Alcanzada!</h3>
                  <p className="mb-6 text-gray-300">Has superado tu objetivo de ${(goal.target_amount || 0).toLocaleString()}.</p>
                  <Button onClick={() => handleArchive(goal.id)} className="border-none bg-yellow-500 px-6 font-bold text-gray-900 hover:bg-yellow-600">
                    Celebrar y Archivar
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {goalsForTab.length === 0 && (
          <div className="app-empty-state col-span-full rounded-2xl py-16 text-center">
            <div className="app-muted-panel mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Target className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="mb-2 text-xl font-medium text-gray-900 dark:text-white">No hay metas {status === 'active' ? 'activas' : 'en esta sección'}</h3>
            <p className="mx-auto mb-6 max-w-sm text-gray-500 dark:text-gray-400">
              {status === 'active'
                ? 'Define un nuevo objetivo para motivar tus ventas y seguir tu crecimiento.'
                : 'Tus metas cumplidas o archivadas aparecerán aquí.'}
            </p>
            {status === 'active' && canManage && (
              <Button onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}>
                Crear mi primera meta
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <PageLayout data-tour="sales-goals.panel">
      <PageHeader
        title="Metas de Ventas"
        description="Monitorea y alcanza tus objetivos financieros sin perder de vista las metas activas."
        action={canManage ? (
          <PageHeaderActionButton
            onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
            icon={Plus}
            label="Nueva meta"
            mobileLabel="Meta"
          />
        ) : undefined}
      />

      <PageBody>
        <PageStack>
          <div className="hidden lg:block">
            <PageStack>
              <PageNotice
                description="Empieza por las metas activas. El progreso global queda como referencia secundaria para no tapar la operación principal."
                dismissible
              />

              <PageToolbarCard className="app-toolbar">
                {goalsToolbarContent}
              </PageToolbarCard>
            </PageStack>
          </div>

          <MobileUnifiedPageShell
            utilityBar={(
              <MobileUtilityBar>
                <MobileFilterDrawer summary={mobileFilterSummary} {...mobileGoalFilters.sheetProps}>
                  {mobileGoalsToolbarContent}
                </MobileFilterDrawer>
                <MobileSummaryDrawer summary={`${filteredGoals.length} meta(s)`}>
                  {goalsSummaryContent}
                </MobileSummaryDrawer>
                <MobileHelpDisclosure summary="Cómo usar metas">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Empieza por las activas. El progreso global queda disponible como resumen secundario para que la lista siga siendo protagonista.
                  </p>
                </MobileHelpDisclosure>
              </MobileUtilityBar>
            )}
          >
            <div className="min-h-0">
              <SwipePager
                activePageId={activeTab}
                onPageChange={(id) => setActiveTab(id as 'active' | 'completed' | 'archived')}
                className="flex-1"
                contentScroll="visible"
                enableSwipe={false}
                pages={[
                  {
                    id: 'active',
                    title: 'Activas',
                    icon: Target,
                    badge: goals.filter((g) => g.status === 'active').length,
                    content: renderGoalsGrid('active'),
                  },
                  {
                    id: 'completed',
                    title: 'Completadas',
                    icon: CheckCircle,
                    badge: goals.filter((g) => g.status === 'completed').length,
                    content: renderGoalsGrid('completed'),
                  },
                  {
                    id: 'archived',
                    title: 'Archivadas',
                    icon: Archive,
                    badge: goals.filter((g) => g.status === 'archived').length,
                    content: renderGoalsGrid('archived'),
                  },
                ]}
              />
            </div>

            <div className="hidden lg:block">
              <PageSummary title="Resumen global" description="Consulta el progreso total sin quitarle protagonismo a la lista de metas.">
                {goalsSummaryContent}
              </PageSummary>
            </div>
          </MobileUnifiedPageShell>
        </PageStack>
      </PageBody>

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
            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          
          {!offlineProductMode && canManage && members.length > 0 && (
            <div className="space-y-4">
                {/* Assignment */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Asignar a Miembro (Responsable)
                    </label>
                    <select
                        value={formData.assigned_user_id}
                        onChange={(e) => setFormData({...formData, assigned_user_id: e.target.value})}
                        className="app-select w-full rounded-lg p-2.5"
                    >
                        <option value={user?.id}>Yo (Master Account)</option>
                        {members.map(m => (
                            <option key={m.user_id} value={m.user_id}>
                                {m.user_name || m.user_email} ({m.role})
                            </option>
                        ))}
                    </select>
                </div>
                
                {/* Visibility */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Visible para (Adicionales)
                    </label>
                    <div className="app-muted-panel rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                         {members.filter(m => m.user_id.toString() !== formData.assigned_user_id).map(m => (
                             <label key={m.user_id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600/50 p-1 rounded">
                                 <input 
                                     type="checkbox"
                                     checked={formData.viewers.includes(m.user_id.toString())}
                                     onChange={(e) => {
                                         const id = m.user_id.toString();
                                         if (e.target.checked) {
                                             setFormData(prev => ({ ...prev, viewers: [...prev.viewers, id] }));
                                         } else {
                                             setFormData(prev => ({ ...prev, viewers: prev.viewers.filter(v => v !== id) }));
                                         }
                                     }}
                                     className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 dark:border-gray-500 dark:bg-gray-600"
                                 />
                                 <span className="text-sm text-gray-700 dark:text-gray-200">{m.user_name || m.user_email}</span>
                             </label>
                         ))}
                         {members.filter(m => m.user_id.toString() !== formData.assigned_user_id).length === 0 && (
                             <p className="text-xs text-gray-500 italic">No hay otros miembros disponibles.</p>
                         )}
                    </div>
                    <p className="text-xs text-gray-500">
                        El responsable y el dueño siempre pueden ver la meta.
                    </p>
                </div>
            </div>
          )}

          <div className="relative">
            <Input 
              label="Monto Objetivo ($)"  
              type="number" 
              value={formData.target_amount} 
              onChange={(e) => setFormData({...formData, target_amount: e.target.value})} 
              placeholder="0.00" 
            className="pl-8 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Fecha Inicio" 
              type="date" 
              value={formData.start_date} 
              onChange={(e) => setFormData({...formData, start_date: e.target.value})} 
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <Input 
              label="Fecha Fin" 
              type="date" 
              value={formData.end_date} 
              onChange={(e) => setFormData({...formData, end_date: e.target.value})} 
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-300">
              Te notificaremos cuando estés cerca de cumplir tu meta o si necesitas acelerar el ritmo.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t app-divider">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Guardando...' : editingGoal ? 'Actualizar Meta' : 'Crear Meta'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};
