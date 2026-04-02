import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, FileText } from 'lucide-react';
import logo from '../assets/logo.png';

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300 font-sans">
      {/* Header */}
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
          <h1 className="text-4xl font-bold text-white mb-4">Política de Privacidad</h1>
          <p className="text-gray-400">Última actualización: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 md:p-12 border border-gray-800 shadow-xl space-y-12">
          {/* Introduction */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">1. Introducción</h2>
            </div>
            <p className="leading-relaxed mb-4">
              En <strong>EnCaja</strong>, nos tomamos muy en serio la privacidad de tus datos. Esta política describe cómo recopilamos, usamos y protegemos la información personal y comercial que nos proporcionas al utilizar nuestra plataforma de gestión de negocios.
            </p>
            <p className="leading-relaxed">
              Al utilizar nuestros servicios, aceptas las prácticas descritas en esta política. Si no estás de acuerdo con alguna parte de esta política, te recomendamos no utilizar nuestros servicios.
            </p>
          </section>

          {/* Information Collection */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Eye className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">2. Información que Recopilamos</h2>
            </div>
            <p className="leading-relaxed mb-4">
              Recopilamos información para proporcionar mejores servicios a todos nuestros usuarios. Los tipos de información que recopilamos incluyen:
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-blue-500">
              <li><strong>Información de la Cuenta:</strong> Nombre, correo electrónico, número de teléfono y contraseña encriptada.</li>
              <li><strong>Datos del Negocio:</strong> Nombre del negocio, inventario, registros de ventas, gastos y lista de clientes.</li>
              <li><strong>Datos de Uso:</strong> Información sobre cómo interactúas con nuestra aplicación, incluyendo frecuencia de uso y características preferidas.</li>
            </ul>
          </section>

          {/* Use of Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">3. Uso de la Información</h2>
            </div>
            <p className="leading-relaxed mb-4">
              Utilizamos la información recopilada para los siguientes propósitos:
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-green-500">
              <li>Proveer, mantener y mejorar nuestros servicios.</li>
              <li>Procesar tus transacciones y generar reportes financieros.</li>
              <li>Enviarte notificaciones técnicas, actualizaciones de seguridad y mensajes de soporte.</li>
              <li>Desarrollar nuevas características y funcionalidades basadas en patrones de uso.</li>
            </ul>
          </section>

          {/* Data Protection */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white">4. Protección de Datos</h2>
            </div>
            <p className="leading-relaxed mb-4">
              Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos contra el acceso no autorizado, la alteración, divulgación o destrucción.
            </p>
            <p className="leading-relaxed">
              Tus contraseñas se almacenan mediante algoritmos de hash seguros. Utilizamos conexiones SSL/TLS para cifrar la transmisión de datos entre tu dispositivo y nuestros servidores. Realizamos copias de seguridad periódicas para prevenir la pérdida de información.
            </p>
          </section>

          {/* Contact */}
          <section className="border-t border-gray-800 pt-8 mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">¿Tienes dudas?</h2>
            <p className="leading-relaxed mb-6">
              Si tienes preguntas sobre nuestra política de privacidad o sobre cómo manejamos tus datos, no dudes en contactarnos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="mailto:soporte@encaja.app" 
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors font-medium"
              >
                Enviar correo
              </a>
              <a 
                href="https://wa.me/1234567890" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-medium"
              >
                Contactar por WhatsApp
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

export default PrivacyPolicy;
