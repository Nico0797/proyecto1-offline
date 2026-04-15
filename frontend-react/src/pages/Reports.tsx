import { useEffect, useState } from 'react';
import { PieChart } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { CombinedReportsTab, ProfitabilityReportTab, TeamReportTab } from '../components/Reports';
import { PowerBIEmbedContainer } from '../components/Analytics/PowerBIEmbed';
import { CompactActionGroup, PageBody, PageHeader, PageLayout } from '../components/Layout/PageLayout';
import { Button } from '../components/ui/Button';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { MobileInlineTabs, type MobileViewOption } from '../components/mobile/MobileContentFirst';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { isBackendCapabilitySupported } from '../config/backendCapabilities';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';

export const Reports = () => {
  const { activeBusiness } = useBusinessStore();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'native' | 'bi'>('native');
  const [nativeSubTab, setNativeSubTab] = useState<'catalog' | 'profitability' | 'team'>('catalog');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('reports'));
  const supportsProfitability = isBackendCapabilitySupported('profitability');

  useEffect(() => {
    const tab = searchParams.get('tab');
    const subtab = searchParams.get('subtab');
    const start = searchParams.get('start_date');
    const end = searchParams.get('end_date');

    if (tab === 'native' || tab === 'bi') {
      setActiveTab(tab);
    }
    if (subtab === 'catalog' || subtab === 'team' || (subtab === 'profitability' && supportsProfitability)) {
      setNativeSubTab(subtab);
    } else if (subtab === 'profitability' && !supportsProfitability) {
      setNativeSubTab('catalog');
    }
    if (start && end) {
      setDateRange((prev) =>
        prev.start === start && prev.end === end
          ? prev
          : { start, end, preset: 'custom' }
      );
    }
  }, [searchParams, supportsProfitability]);

  const updateReportsParams = (next: Partial<{ tab: 'native' | 'bi'; subtab: 'catalog' | 'profitability' | 'team' }>) => {
    const params = new URLSearchParams(searchParams);
    if (next.tab) params.set('tab', next.tab);
    if (next.subtab) params.set('subtab', next.subtab);
    setSearchParams(params, { replace: true });
  };

  if (!activeBusiness) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Selecciona un negocio.</div>;
  }

  const modeSwitcher = (
    <div className="app-segmented-control flex w-full sm:w-auto">
      <button
        onClick={() => {
          setActiveTab('native');
          updateReportsParams({ tab: 'native' });
        }}
        className={`app-segmented-control__item flex-1 px-4 py-2 text-sm font-medium transition-all sm:flex-none ${
          activeTab === 'native'
            ? 'app-segmented-control__item-active text-gray-900 dark:text-white'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        Reportes
      </button>
      <button
        onClick={() => {
          setActiveTab('bi');
          updateReportsParams({ tab: 'bi' });
        }}
        className={`app-segmented-control__item flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all sm:flex-none ${
          activeTab === 'bi'
            ? 'app-segmented-control__item-active text-blue-600 dark:text-blue-400'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
      >
        <PieChart className="h-4 w-4" />
        BI
        {user?.plan !== 'business' ? (
          <span className="app-chip rounded px-1 text-[10px]">PRO</span>
        ) : null}
      </button>
    </div>
  );

  const periodControl = activeTab === 'native' ? (
    <PeriodFilter
      moduleId="reports"
      value={dateRange}
      onChange={setDateRange}
      className="w-full lg:min-w-[460px]"
    />
  ) : undefined;

  const nativeOptions: MobileViewOption[] = [
    {
      id: 'catalog',
      label: 'Catalogo de reportes',
      shortLabel: 'Catálogo',
      dataTour: 'reports.catalog',
    },
    ...(supportsProfitability ? [{
      id: 'profitability',
      label: 'Rentabilidad',
      shortLabel: 'Rentabilidad',
      dataTour: 'reports.profitability',
    }] : []),
    {
      id: 'team',
      label: 'Gestion de equipo',
      shortLabel: 'Equipo',
      dataTour: 'reports.team',
    },
  ] as const;

  const handleNativeSubTabChange = (value: string) => {
    const next = value as 'catalog' | 'profitability' | 'team';
    setNativeSubTab(next);
    updateReportsParams({ tab: 'native', subtab: next });
  };

  return (
    <PageLayout data-tour="reports.panel">
      <PageHeader
        title="Report Studio"
        description="Descarga reportes detallados y metricas sin perder el foco en el periodo y el tipo de analisis."
        mobileFab={{
          label: activeTab === 'native' ? 'BI' : 'Reportes',
          icon: PieChart,
          onClick: () => {
            const nextTab = activeTab === 'native' ? 'bi' : 'native';
            setActiveTab(nextTab);
            updateReportsParams({ tab: nextTab });
          },
        }}
        action={(
          <div data-tour="reports.filters">
            <CompactActionGroup
              collapseLabel="Filtros"
              primary={modeSwitcher}
              secondary={periodControl}
            />
          </div>
        )}
      />

      <PageBody className="app-canvas">
        <div className="app-content-stack mx-auto max-w-7xl">
          {activeTab === 'native' ? (
            <div className="app-section-stack">
              <div className="lg:hidden">
                <MobileInlineTabs options={nativeOptions} activeId={nativeSubTab} onChange={handleNativeSubTabChange} className="w-full" />
              </div>
              <div className="hidden gap-2 lg:flex lg:flex-wrap">
                <Button
                  variant={nativeSubTab === 'catalog' ? 'primary' : 'secondary'}
                  onClick={() => handleNativeSubTabChange('catalog')}
                  size="sm"
                  data-tour="reports.catalog"
                >
                  Catalogo de reportes
                </Button>
                {supportsProfitability ? (
                  <Button
                    variant={nativeSubTab === 'profitability' ? 'primary' : 'secondary'}
                    onClick={() => handleNativeSubTabChange('profitability')}
                    size="sm"
                    data-tour="reports.profitability"
                  >
                    Rentabilidad
                  </Button>
                ) : null}
                <Button
                  variant={nativeSubTab === 'team' ? 'primary' : 'secondary'}
                  onClick={() => handleNativeSubTabChange('team')}
                  size="sm"
                  data-tour="reports.team"
                >
                  Gestion de equipo
                </Button>
              </div>
            </div>
          ) : null}

          {activeTab === 'native' ? (
            nativeSubTab === 'catalog' ? (
              <div data-tour="reports.catalog">
                <CombinedReportsTab dateRange={dateRange} />
              </div>
            ) : nativeSubTab === 'profitability' ? (
              <div data-tour="reports.profitability">
                <ProfitabilityReportTab
                  businessId={activeBusiness.id}
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                  initialFocus={searchParams.get('focus') || undefined}
                  initialStatus={searchParams.get('status') || undefined}
                  initialProductQuery={searchParams.get('product_query') || searchParams.get('product') || undefined}
                />
              </div>
            ) : (
              <div data-tour="reports.team">
                <TeamReportTab businessId={activeBusiness.id} startDate={dateRange.start} endDate={dateRange.end} />
              </div>
            )
          ) : (
            <PowerBIEmbedContainer />
          )}
        </div>
      </PageBody>
    </PageLayout>
  );
};
