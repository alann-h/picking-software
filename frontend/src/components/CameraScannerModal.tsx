import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, Zap, ZapOff } from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (_decodedText: string) => void;
}

const CameraScannerModal: React.FC<CameraScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Helper to safely stop the scanner
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
    try {
      setError('');
      
      // Safety check: Ensure the DOM element exists before initializing
      const element = document.getElementById('qr-reader');
      if (!element) {
        // Retry shortly if DOM isn't ready yet (React render delay)
        setTimeout(() => startScanning(cameraId), 50);
        return;
      }

      // Initialize only if not already initialized
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader', {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
          ],
        });
      }

      // If already scanning, stop first
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      // CONFIGURATION FIX FOR ANDROID:
      // Removed aspectRatio: 1.0. This causes OverconstrainedError on many Androids.
      // We rely on object-fit: cover in CSS to handle the square look.
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        // aspectRatio: 1.0, <--- REMOVED THIS
      };

      const startSuccess = (decodedText: string) => {
        // Stop scanning immediately upon success to prevent duplicate reads
        cleanupScanner().then(() => {
          onScanSuccess(decodedText);
          onClose();
        });
      };

      if (cameraId) {
        await html5QrCodeRef.current.start(
          cameraId,
          config,
          startSuccess,
          () => {}
        );
      } else {
        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          config,
          startSuccess,
          () => {}
        );
      }

      setIsScanning(true);
      
      // Camera enumeration logic
      if (cameras.length === 0) {
         Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length > 0) {
              setCameras(devices);
              const rearCameraIndex = devices.findIndex(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('environment')
              );
              if (rearCameraIndex !== -1) setCurrentCameraIndex(rearCameraIndex);
            }
         }).catch(err => {
           console.warn("Error getting cameras", err);
         });
      }
      
      // Check torch
      try {
        const settings = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
        // @ts-ignore - torchFeature is not always in types but exists in library
        setHasTorch(!!settings?.torchFeature?.()?.isSupported?.());
      } catch (e) {
        setHasTorch(false);
      }

    } catch (err: any) {
      console.error('Scanner error:', err);
      let errorMsg = 'Failed to start camera';
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        errorMsg = 'Camera permission denied';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is in use or not accessible';
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = 'Camera incorrectly configured';
      }
      
      setError(errorMsg);
      setIsScanning(false);
    }
  };

  const handleSwitchCamera = () => {
    if (cameras.length < 2) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    startScanning(cameras[nextIndex].id);
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn }]
      } as any);
      setTorchOn(!torchOn);
    } catch (err) {
      console.error('Error toggling torch:', err);
    }
  };

  // Main Effect to handle Open/Close lifecycle
  useEffect(() => {
    let mounted = true;

    if (isOpen) {
      // Small delay to ensure Modal DOM is rendered before library tries to attach
      setTimeout(() => {
        if (mounted) startScanning();
      }, 100);
    } else {
      cleanupScanner();
    }

    return () => {
      mounted = false;
      cleanupScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header / Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent">
        <button 
          onClick={onClose}
          className="p-2 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex gap-4">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                torchOn ? 'bg-yellow-400/80 text-black' : 'bg-black/30 text-white hover:bg-black/50'
              }`}
            >
              {torchOn ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
            </button>
          )}
          
          {cameras.length > 1 && (
            <button
              onClick={handleSwitchCamera}
              className="p-2 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Scanner Viewport */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {/* The div ID must match the one used in new Html5Qrcode() */}
        <div id="qr-reader" className="w-full h-full" />
        
        {/* Overlay Guide */}
        {!error && isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* We removed aspect ratio from JS, so we ensure the camera fills the screen 
               and we put this square overlay on top to guide the user.
            */}
            <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1 rounded-br-lg" />
              
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-scan" />
            </div>
            <p className="absolute mt-80 text-white/80 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
              Align code within frame
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gray-900 text-center z-20">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Camera Error</h3>
            <p className="text-gray-400 mb-6 max-w-xs">{error}</p>
            <button
              onClick={() => startScanning()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <style>{`
        #qr-reader {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        #qr-reader video {
          object-fit: cover;
          width: 100% !important;
          height: 100% !important;
          border-radius: 0 !important;
        }
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CameraScannerModal;