import { PageBody, PageHeader, PageLayout } from '../components/Layout/PageLayout';
import { SyncCenterPanel } from '../components/Settings/SyncCenterPanel';

export const InvoiceSyncCenter = () => {
  return (
    <PageLayout data-tour="invoice-sync.panel">
      <PageHeader
        title="Centro de sincronizacion"
        description="Revisa operaciones offline, conflictos y reintentos sin depender de un banner permanente."
      />

      <PageBody className="app-canvas">
        <SyncCenterPanel />
      </PageBody>
    </PageLayout>
  );
};
