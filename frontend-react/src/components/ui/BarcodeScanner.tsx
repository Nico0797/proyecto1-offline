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
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE
          ]
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
          (errorMessage) => {
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
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-[70]">
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="w-full max-w-md px-4 relative flex flex-col items-center">
        <h3 className="text-white text-center mb-4 text-lg font-medium">Escanea el código</h3>
        
        <div id="reader" className="w-full rounded-lg overflow-hidden bg-black border-2 border-white/30 aspect-square relative">
            {/* Placeholder visual mientras carga */}
            {!error && !scannerRef.current && (
                <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    Iniciando cámara...
                </div>
            )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-500/90 text-white rounded-lg text-center text-sm w-full">
            {error}
            <div className="mt-2 text-xs opacity-80">
                Si persiste, verifica permisos de cámara en Android.
            </div>
          </div>
        )}
        
        <div className="mt-6 flex justify-center">
             <p className="text-gray-400 text-xs text-center">
                Apunta al código de barras.
             </p>
        </div>
      </div>
    </div>
  );
};
