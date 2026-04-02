import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    const scannerId = "reader";
    let isMounted = true;
    
    const startScanner = async () => {
      try {
        // Asegurarse de limpiar cualquier instancia previa
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) {
                // Ignore stop error
            }
        }

        scannerRef.current = new Html5Qrcode(scannerId);
        
        const config = {
          fps: 10,
          // No fijar qrbox para usar toda la pantalla
          // qrbox: { width: 250, height: 250 }, 
          // aspectRatio: 1.0, // Dejar que la cámara decida
          formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE
          ],
          experimentalFeatures: {
               useBarCodeDetectorIfSupported: true
          }
        };

        // Intentar usar la cámara trasera por defecto
        // facingMode: "environment" es más robusto que buscar IDs de cámara
        await scannerRef.current.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            if (isMounted) {
                onScan(decodedText);
                // Detener inmediatamente tras éxito
                stopScanner();
            }
          },
          (_errorMessage) => {
            // Ignore frame errors
          }
        );

      } catch (err: any) {
        console.error("Scanner Error:", err);
        if (isMounted) {
            let msg = "Error iniciando cámara.";
            if (err?.name === 'NotAllowedError') {
                msg = "Permiso de cámara denegado. Habilítalo en ajustes.";
            } else if (err?.name === 'NotFoundError') {
                msg = "No se encontró cámara.";
            } else if (err?.name === 'NotReadableError') {
                msg = "La cámara está ocupada o no es accesible. Reinicia la app.";
            } else if (location.protocol !== 'https:' && location.hostname !== 'localhost' && !location.hostname.startsWith('127.0.0.')) {
                 msg = "La cámara requiere conexión segura (HTTPS) o localhost.";
            }
            setError(msg);
        }
      }
    };

    // Pequeño delay para asegurar que el DOM (div#reader) esté listo
    const timer = setTimeout(() => {
        startScanner();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.error("Error stopping scanner cleanup", e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="absolute top-4 right-4 z-[70]">
        <button onClick={onClose} className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 backdrop-blur-sm">
          <X className="w-8 h-8" />
        </button>
      </div>
      
      <div className="flex-1 w-full h-full relative bg-black flex items-center justify-center">
        <div id="reader" className="w-full h-full object-cover">
            {/* Placeholder visual mientras carga */}
            {!error && !scannerRef.current && (
                <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    Iniciando cámara...
                </div>
            )}
        </div>
        
        {/* Overlay de guía de escaneo */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1 rounded-br-lg"></div>
            </div>
        </div>
        
        {error && (
          <div className="absolute bottom-20 left-4 right-4 p-4 bg-red-500/90 text-white rounded-xl text-center shadow-lg backdrop-blur-md z-[70]">
            <p className="font-medium">{error}</p>
            <div className="mt-1 text-xs opacity-90">
                Verifica permisos en: Ajustes {'>'} Aplicaciones {'>'} Permisos
            </div>
          </div>
        )}
        
        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-[60]">
             <p className="px-4 py-2 bg-black/60 text-white text-sm rounded-full backdrop-blur-md">
                Apunta al código de barras
             </p>
        </div>
      </div>
    </div>
  );
};
