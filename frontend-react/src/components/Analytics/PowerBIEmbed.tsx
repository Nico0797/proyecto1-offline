import { useEffect, useState } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Loader2, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '../ui/Button';

// NOTE: To fully implement Power BI, install: npm install powerbi-client-react powerbi-client
// import { PowerBIEmbed } from 'powerbi-client-react';
// import { models } from 'powerbi-client';

interface PowerBIConfig {
  type: string;
  id: string;
  embedUrl: string;
  accessToken: string;
  tokenId: string;
  expiry: string;
}

export const PowerBIEmbedContainer = () => {
  const { activeBusiness } = useBusinessStore();
  const { user } = useAuthStore();
  const [config, setConfig] = useState<PowerBIConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeBusiness && user?.plan === 'business') {
      fetchConfig();
    }
  }, [activeBusiness, user?.plan]);

  const fetchConfig = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/businesses/${activeBusiness.id}/bi/token`);
      setConfig(res.data);
    } catch (err: any) {
      console.error("Error fetching BI config:", err);
      setError(err.response?.data?.error || "Error al cargar Power BI");
    } finally {
      setLoading(false);
    }
  };

  if (user?.plan !== 'business') {
    return (
      <div className="app-surface flex flex-col items-center justify-center rounded-lg p-12 text-center">
        <div className="app-muted-panel mb-4 rounded-full p-4">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Analítica Avanzada
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
          Los dashboards interactivos de Power BI están disponibles exclusivamente para el plan Business.
        </p>
        <Button variant="primary">
          Actualizar a Business
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-500">Cargando entorno de Power BI...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No disponible</h3>
        <p className="text-gray-500 mt-2">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchConfig}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="app-surface h-[600px] w-full overflow-hidden rounded-lg shadow-sm">
      {/* 
        PLACEHOLDER: In production, uncomment the PowerBIEmbed component below
        and install the required packages.
      */}
      <div className="app-canvas flex h-full w-full flex-col items-center justify-center">
        <img 
            src="https://upload.wikimedia.org/wikipedia/commons/c/cf/New_Power_BI_Logo.svg" 
            alt="Power BI" 
            className="w-16 h-16 mb-4 opacity-80"
        />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Power BI Ready</h3>
        <div className="app-surface mt-4 max-w-lg overflow-x-auto rounded border p-4 text-left text-sm font-mono">
            <p className="text-green-600 mb-2">// Conexión exitosa. Token generado.</p>
            <p>Report ID: {config.id}</p>
            <p>Embed URL: {config.embedUrl?.substring(0, 40)}...</p>
            <p>Token Expiry: {config.expiry}</p>
        </div>
        <p className="mt-6 text-gray-500 text-sm max-w-md text-center">
            El backend ha generado correctamente el Embed Token seguro. 
            Para visualizar el reporte real, instala <code>powerbi-client-react</code> en el frontend.
        </p>
      </div>

      {/* 
      <PowerBIEmbed
        embedConfig={{
          type: 'report',
          id: config.id,
          embedUrl: config.embedUrl,
          accessToken: config.accessToken,
          tokenType: models.TokenType.Embed,
          settings: {
            panes: {
              filters: {
                visible: false
              },
              pageNavigation: {
                visible: true
              }
            }
          }
        }}
        cssClassName={"h-full w-full"}
        getEmbeddedComponent={(embeddedReport) => {
          // window.report = embeddedReport;
        }}
      />
      */}
    </div>
  );
};
