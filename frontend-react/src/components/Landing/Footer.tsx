import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { MessageCircle, Mail, Instagram, Facebook } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-gray-950 border-t border-gray-800 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <img src={logo} alt="EnCaja Logo" className="h-8 w-auto" />
              <span className="text-xl font-bold text-white">EnCaja</span>
            </Link>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              La plataforma más simple para organizar y hacer crecer tu negocio. 
              Control total en la palma de tu mano.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white mb-6">Producto</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/login" className="hover:text-blue-400 transition-colors">Entrar</Link></li>
              <li><a href="#pricing" className="hover:text-blue-400 transition-colors">Planes</a></li>
              <li><a href="#features" className="hover:text-blue-400 transition-colors">Características</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Ayuda</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/help" className="hover:text-blue-400 transition-colors">Centro de Ayuda</Link></li>
              <li><Link to="/contact" className="hover:text-blue-400 transition-colors">Soporte</Link></li>
              <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacidad</Link></li>
              <li><Link to="/terms" className="hover:text-blue-400 transition-colors">Términos</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-white mb-6">Contacto</h4>
            <div className="space-y-4">
              <a 
                href="https://wa.me/1234567890" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-gray-400 hover:text-green-400 transition-colors group"
              >
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-green-500/10 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span>WhatsApp Soporte</span>
              </a>
              
              <a 
                href="mailto:soporte@encaja.app" 
                className="flex items-center gap-3 text-gray-400 hover:text-blue-400 transition-colors group"
              >
                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-blue-500/10 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <span>soporte@encaja.app</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} EnCaja. Todos los derechos reservados.
          </p>
          <p className="text-sm text-gray-600">
            Hecho con ❤️ para emprendedores
          </p>
        </div>
      </div>
    </footer>
  );
};
