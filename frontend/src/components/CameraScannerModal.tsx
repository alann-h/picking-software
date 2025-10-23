import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';
import { useSnackbarContext } from './SnackbarContext';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (_decodedText: string) => void;
}

const CameraScannerModal: React.FC<CameraScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);

  const startScanning = async () => {
    try {
      setError('');
      
      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        throw new Error('No cameras found on this device');
      }

      // Try to find rear camera, otherwise use first available
      const rearCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      const cameraId = rearCamera ? rearCamera.id : devices[0].id;

      // Initialize scanner
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader', { verbose: false });
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      };

      await html5QrCodeRef.current.start(
        cameraId,
        config,
        (decodedText) => {
          // Success callback
          onScanSuccess(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Error callback (ignore "not found" errors as they happen during scanning)
          // Only log actual errors
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      let errorMsg = 'Failed to start camera';
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        errorMsg = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      handleOpenSnackbar(errorMsg, 'error');
    }
  };

  const stopScanning = async () => {
    try {
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
    setIsScanning(false);
  };

  // Auto-start when modal opens
  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanning();
    }
    
    return () => {
      if (isOpen) {
        stopScanning();
      }
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative z-50 w-full max-w-md bg-white rounded-lg shadow-xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Scan Barcode</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Scanner Area */}
        <div id="qr-reader" className="w-full" />

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={startScanning}
              className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Instructions */}
        {isScanning && !error && (
          <p className="mt-4 text-sm text-center text-gray-600">
            Position the barcode within the camera view
          </p>
        )}
      </div>
    </div>
  );
};

export default CameraScannerModal;