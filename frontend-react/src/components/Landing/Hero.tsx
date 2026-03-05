import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { ArrowRight, ChevronRight, Smartphone } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10 -mt-20">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Logo & Badge Container */}
          <div className="flex flex-col items-center gap-6 mb-8 animate-fade-in-up">
             {/* Logo */}
             <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                <img 
                  src={logo} 
                  alt="EnCaja Logo" 
                  className="w-48 sm:w-64 md:w-80 lg:w-96 h-auto object-contain drop-shadow-2xl"
                />
                
             </div>

             {/* Badge */}
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm -mt-10">
                <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
                <span className="text-sm text-gray-300 font-medium">Nueva versión 2.0 disponible</span>
             </div>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6 leading-tight">
            Contabilidad simple <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              para tu negocio
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-400 mb-10 max-w-2xl leading-relaxed">
            Controla ventas, gastos, clientes e inventario en un solo lugar. 
            Toma el control total con reportes automáticos y alertas inteligentes.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
            <Link 
              to="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              Entrar ahora
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="#pricing" 
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold backdrop-blur-sm transition-all duration-300 flex items-center justify-center gap-2"
            >
              Ver planes
              <ChevronRight className="w-5 h-5" />
            </a>
            <a 
              href="/assets/encaja.apk" 
              download
              className="w-full sm:w-auto px-8 py-4 bg-green-600/90 hover:bg-green-500 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-5 h-5" />
              Descargar App
            </a>
          </div>

          {/* Mockup */}
          <div className="relative w-full max-w-5xl mx-auto mt-8 perspective-1000">
            <div className="relative bg-gray-800/50 border border-white/10 rounded-2xl p-2 backdrop-blur-xl shadow-2xl transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none" />
              {/* Abstract UI representation since we don't have a screenshot */}
              <div className="bg-gray-900 rounded-xl overflow-hidden aspect-[16/9] relative grid grid-cols-12 gap-4 p-6">
                 {/* Sidebar */}
                 <div className="hidden md:flex col-span-2 flex-col gap-4 border-r border-gray-800 pr-4">
                    <div className="h-8 w-8 bg-blue-500/20 rounded-lg mb-4" />
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-4 w-full bg-gray-800 rounded-md" />
                    ))}
                 </div>
                 
                 {/* Main Content */}
                 <div className="col-span-12 md:col-span-10 flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="h-8 w-48 bg-gray-800 rounded-lg" />
                        <div className="flex gap-2">
                            <div className="h-8 w-8 bg-gray-800 rounded-full" />
                            <div className="h-8 w-8 bg-gray-800 rounded-full" />
                        </div>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-24 bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                                <div className="h-4 w-12 bg-gray-700 rounded mb-2" />
                                <div className="h-8 w-24 bg-gray-600 rounded" />
                            </div>
                        ))}
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 bg-gray-800/30 border border-gray-700/30 rounded-xl p-4 flex items-end justify-between gap-2 min-h-[200px]">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                            <div key={i} className="w-full bg-blue-500/20 hover:bg-blue-500/40 transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
                        ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
