import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Scale } from 'lucide-react';
import logo from '../assets/logo.png';

export const TermsAndConditions = () => {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 font-sans">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src={logo} alt="EnCaja Logo" className="h-8 w-auto" />
            <span className="text-xl font-bold text-white">EnCaja</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Términos y Condiciones</h1>
          <p className="text-gray-400">Última actualización: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 md:p-12 border border-gray-800 shadow-xl space-y-12">
          {/* Introduction */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">1. Aceptación de los Términos</h2>
            </div>
            <p className="leading-relaxed mb-4">
              Al acceder y utilizar EnCaja, aceptas estar sujeto a estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, no podrás acceder al servicio.
            </p>
          </section>

          {/* Accounts */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">2. Cuentas de Usuario</h2>
            </div>
            <p className="leading-relaxed mb-4">
              Cuando creas una cuenta con nosotros, debes proporcionarnos información precisa, completa y actualizada. El incumplimiento de esta condición constituye una violación de los Términos, lo que puede resultar en la terminación inmediata de tu cuenta en nuestro servicio.
            </p>
            <p className="leading-relaxed">
              Eres responsable de salvaguardar la contraseña que utilizas para acceder al servicio y de cualquier actividad o acción bajo tu contraseña.
            </p>
          </section>

          {/* Use License */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                <Scale className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">3. Uso del Servicio</h2>
            </div>
            <p className="leading-relaxed mb-4">
              Se concede permiso para utilizar EnCaja para la gestión de tu negocio. No debes:
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-green-500">
              <li>Modificar o copiar los materiales del software.</li>
              <li>Utilizar los materiales para cualquier propósito comercial fuera de la gestión de tu propio negocio.</li>
              <li>Intentar descompilar o realizar ingeniería inversa de cualquier software contenido en EnCaja.</li>
              <li>Eliminar cualquier derecho de autor u otra notación de propiedad de los materiales.</li>
            </ul>
          </section>

          {/* Limitations */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Limitaciones</h2>
            <p className="leading-relaxed mb-4">
              En ningún caso EnCaja o sus proveedores serán responsables de ningún daño (incluyendo, sin limitación, daños por pérdida de datos o beneficios, o debido a la interrupción del negocio) que surja del uso o la imposibilidad de usar nuestros servicios.
            </p>
          </section>

          {/* Contact */}
          <section className="border-t border-gray-800 pt-8 mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">Contacto Legal</h2>
            <p className="leading-relaxed mb-6">
              Si tienes preguntas sobre estos Términos y Condiciones, por favor contáctanos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="mailto:legal@encaja.app" 
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors font-medium"
              >
                legal@encaja.app
              </a>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} EnCaja. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default TermsAndConditions;
