import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, RefreshCw, Zap, ZapOff, AlertCircle, ScanFace } from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (_decodedText: string) => void;
}

const CameraScannerModal: React.FC<CameraScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // --- Logic ---
  const cleanupScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Failed to clear scanner', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  const startScanning = async (cameraId?: string) => {
    if (html5QrCodeRef.current?.isScanning) return; 

    try {
      setError('');
      setDebugInfo('');
      
      const element = document.getElementById('qr-reader-view');
      if (!element) {
        setTimeout(() => startScanning(cameraId), 100);
        return;
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-view', {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE, 
            Html5QrcodeSupportedFormats.CODE_128, 
            Html5QrcodeSupportedFormats.EAN_13
          ]
        });
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0 
      };

      const onSuccess = (decodedText: string) => {
        html5QrCodeRef.current?.pause();
        setTimeout(() => {
           cleanupScanner().then(() => {
             onScanSuccess(decodedText);
             onClose();
           });
        }, 300);
      };

      try {
        const devices = await Html5Qrcode.getCameras();
        const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
        );

        if (backCamera) {
            await html5QrCodeRef.current.start(backCamera.id, config, onSuccess, () => {});
        } else {
            await html5QrCodeRef.current.start({ facingMode: "environment" }, config, onSuccess, () => {});
        }
        
        setIsScanning(true);
        
        try {
          const settings = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
          // @ts-ignore
          setHasTorch(!!settings?.torchFeature?.()?.isSupported?.());
        } catch (e) { setHasTorch(false); }

      } catch (startError: any) {
        console.warn("Primary start failed, trying fallback...", startError);
        await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 }, 
            onSuccess, 
            () => {}
        );
        setIsScanning(true);
      }

    } catch (err: any) {
      console.error('Scanner fail:', err);
      let msg = 'Camera failed to start.';
      let debug = err.message || JSON.stringify(err);

      if (err.name === 'NotAllowedError') msg = 'Camera permission denied.';
      if (err.name === 'NotFoundError') msg = 'No camera found.';
      if (err.name === 'NotReadableError') msg = 'Camera is busy.';
      if (!window.isSecureContext) msg = 'HTTPS Required.';
      
      setError(msg);
      setDebugInfo(debug);
      setIsScanning(false);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      // @ts-ignore
      await html5QrCodeRef.current.applyVideoConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    let mounted = true;
    if (isOpen) {
      setTimeout(() => { if (mounted) startScanning(); }, 150);
    } else {
      cleanupScanner();
    }
    return () => { mounted = false; cleanupScanner(); };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black flex flex-col font-sans">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-4 flex justify-between items-center bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-safe-area">
        <div className="flex items-center gap-2 text-white/90">
            <ScanFace className="w-5 h-5 opacity-80" />
            <span className="text-sm font-medium tracking-wide">Scan Code</span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white/90 backdrop-blur-md hover:bg-white/20 transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {/* The Video Element */}
        <div id="qr-reader-view" className="absolute inset-0 w-full h-full" />
        
        {/* --- NEW CLEAN OVERLAY --- */}
        {isScanning && !error && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
           
           {/* The Modern Scanner Box 
               - We use a massive outer shadow (ring-[9999px]) to create the dark overlay 
               - This ensures the cutout and the border are perfectly aligned, no "double edges".
           */}
           <div className="relative w-[280px] h-[280px] rounded-[35px] ring-[9999px] ring-black/60">
              {/* Thin Glowing Border */}
              <div className="absolute inset-0 rounded-[35px] border-[1.5px] border-white/50 shadow-[inset_0_0_15px_rgba(255,255,255,0.1)]"></div>
           </div>

           {/* Helper Text */}
           <div className="absolute mt-[340px] text-white/80 text-sm font-medium tracking-wide px-5 py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              Align code within the frame
           </div>
        </div>
        )}
        {/* ------------------------- */}

        {/* Loading */}
        {!isScanning && !error && (
          <div className="absolute z-30 flex flex-col items-center text-white/70">
             <RefreshCw className="w-8 h-8 animate-spin mb-4 opacity-50" />
             <p className="text-sm font-medium">Starting camera...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute z-30 inset-6 flex items-center justify-center pointer-events-none">
            <div className="bg-neutral-900/90 backdrop-blur-xl p-6 rounded-2xl border border-white/10 flex flex-col items-center text-center max-w-sm pointer-events-auto shadow-2xl">
              <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mb-4 ring-1 ring-red-500/30">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{error}</h3>
              <p className="text-neutral-400 text-sm mb-6 leading-relaxed">{debugInfo || "Check permissions."}</p>
              <button
                onClick={() => startScanning()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors active:scale-[0.98]"
              >
                Retry Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 flex justify-center gap-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent pb-safe-area">
        <div className="flex flex-col items-center gap-2">
        <button
            onClick={toggleTorch}
            disabled={!hasTorch || error !== ''}
            className={`p-4 rounded-full transition-all active:scale-95 ${
              torchOn 
                ? 'bg-yellow-500/90 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                : hasTorch 
                  ? 'bg-white/10 text-white/90 backdrop-blur-md hover:bg-white/20'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            {torchOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
          </button>
          <span className="text-xs text-white/50 font-medium">Flash</span>
        </div>
      </div>

      <style>{`
        #qr-reader-view video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
          z-index: 0;
        }
        .pt-safe-area { padding-top: calc(1rem + env(safe-area-inset-top, 0px)); }
        .pb-safe-area { padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px)); }
      `}</style>
    </div>
  );
};

export default CameraScannerModal;