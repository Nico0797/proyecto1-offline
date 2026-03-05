import { useState } from 'react';
import { HelpSearch } from '../components/Help/HelpSearch';
import { HelpTutorialsSection } from '../components/Help/HelpTutorialsSection';
import { SupportWhatsAppButton } from '../components/Help/SupportWhatsAppButton';
import { CATEGORIES } from '../help/helpContent';

export const Help = () => {
  const [, setQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 -m-6 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Centro de Ayuda</h1>
            <p className="text-gray-500 dark:text-gray-400">Encuentra tutoriales, respuestas y herramientas para trabajar mejor.</p>
          </div>
          <SupportWhatsAppButton />
        </div>

        {/* Search + Categories */}
        <HelpSearch onSearch={setQuery} />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <span key={c.id} className="px-3 py-1.5 rounded-full text-xs bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">{c.label}</span>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <a className="p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-cyan-500 transition" href="/help#tutoriales">Iniciar tutorial inicial</a>
          <a className="p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-cyan-500 transition" href="/sales">Registrar una venta</a>
          <a className="p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-cyan-500 transition" href="/payments">Cobrar una deuda</a>
          <a className="p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-cyan-500 transition" href="/products">Crear un producto</a>
          <a className="p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-cyan-500 transition" href="/reports">Exportar reportes</a>
        </div>

        {/* Tutorials */}
        <div id="tutoriales" className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tutoriales</h2>
          <HelpTutorialsSection />
        </div>

        {/* Más secciones (FAQs, Tips, Herramientas) se añadirán en la siguiente iteración */}
      </div>
    </div>
  );
};
