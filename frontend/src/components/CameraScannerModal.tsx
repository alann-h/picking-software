import React, { useEffect, useRef, useState, Fragment } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { X, LoaderCircle } from 'lucide-react';
import { useSnackbarContext } from './SnackbarContext';

const QRCODE_REGION_ID = "reader";

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (_decodedText: string) => void;
}

const CameraScannerModal: React.FC<CameraScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [scannerReady, setScannerReady] = useState(false);

  const stopScanner = async () => {
    const html5QrCode = html5QrCodeRef.current;
    if (html5QrCode && html5QrCode.isScanning) {
      try {
        await html5QrCode.stop();
        console.log("Scanner stopped successfully.");
      } catch (err) {
        console.error("Error stopping the scanner:", err);
      }
    }
    if (!isOpen) {
      setIsLoading(false);
      setErrorMessage(null);
    }
  };

  // Initialize camera and start scanner - MUST be called directly from button click!
  const startScanner = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setDebugInfo('');
    
    try {
      // Check if we're on HTTPS (required for camera on most browsers)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw {
          name: 'SecurityError',
          message: 'Camera access requires HTTPS connection'
        };
      }

      // Request camera access - THIS WILL SHOW THE PERMISSION DIALOG
      // This MUST happen synchronously in the button click handler
      console.log("Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("✅ Camera permission granted!");
      
      // Stop the stream - we just needed it for permission
      stream.getTracks().forEach(track => track.stop());

      // Now get available cameras
      const devices = await Html5Qrcode.getCameras();
      console.log("Available Cameras:", devices);
      
      const cameraDebugInfo = devices.map((d, i) => `${i + 1}. ${d.label || 'Unnamed'} (ID: ${d.id})`).join('\n');
      setDebugInfo(`Found ${devices.length} camera(s):\n${cameraDebugInfo}`);

      if (!devices || devices.length === 0) {
        throw {
          name: 'NotFoundError',
          message: 'No cameras found on this device.'
        };
      }

      // Find the best camera (Samsung/iPhone compatible)
      const environmentCamera = devices.find(device => {
        const label = device.label.toLowerCase();
        return (
          label.includes('back') ||
          label.includes('rear') ||
          label.includes('environment') ||
          label.includes('facing back') ||
          label.includes('main') ||
          label.match(/camera\s*[0-9]+.*back/i) ||
          (label.includes('camera') && label.includes('0') && !label.includes('front'))
        );
      });

      const selectedCamera = environmentCamera || (devices.length > 1 ? devices[devices.length - 1] : devices[0]);
      const cameraIdToUse = selectedCamera.id;
      
      console.log("Selected camera:", selectedCamera.label, cameraIdToUse);
      setDebugInfo(prev => prev + `\n\n✓ Selected: ${selectedCamera.label}`);

      // Initialize the Html5Qrcode scanner
      const readerElement = document.getElementById(QRCODE_REGION_ID);
      if (!readerElement) {
        throw {
          name: 'DOMError',
          message: 'Scanner display area not found'
        };
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(QRCODE_REGION_ID, { verbose: false });
      }

      const html5QrCode = html5QrCodeRef.current;

      // Start the scanner
      if (html5QrCode.getState() === Html5QrcodeScannerState.NOT_STARTED) {
        await html5QrCode.start(
          cameraIdToUse,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            stopScanner();
            onScanSuccess(decodedText);
            onClose();
          },
          (errMessage) => {
            if (!errMessage.includes("NotFoundException") && !errMessage.includes("No QR code found")) {
              console.warn("QR Scanner Error:", errMessage);
            }
          }
        );
        console.log("✅ Scanner started successfully");
        setScannerReady(true);
      }
      
      setIsLoading(false);
    } catch (err: any) {
      console.error("Scanner initialization error:", err);
      handlePermissionError(err);
    }
  };

  const handlePermissionError = (err: any) => {
    const errorDetails = `\n\n🔧 Technical Details:\nError Type: ${err.name || 'Unknown'}\nError Message: ${err.message || 'No message'}`;
    console.error("Camera error details:", err);
    
    let displayError = "Failed to access camera.";
    let helpText = "";
    
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      displayError = "Camera Access Blocked";
      helpText = "\n\n⚠️ You clicked 'Block' or 'Deny' when the browser asked for camera permission.\n\nTo fix this:\n1. Tap the 🔒 lock icon in the address bar (top of screen)\n2. Find 'Camera' and change to 'Allow'\n3. Refresh this page\n4. Try again";
    } else if (err.name === "NotFoundError" || err.name === "DOMError") {
      displayError = "Camera not available.";
      helpText = "\n\nYour device doesn't have a camera or it's not accessible.";
    } else if (err.name === "SecurityError") {
      displayError = "Security Error";
      helpText = "\n\nCamera requires HTTPS. Make sure you're using https:// (not http://)";
    } else {
      displayError = "Error: " + (err.message || 'Unknown error');
    }
    
    setErrorMessage(displayError + helpText + errorDetails);
    handleOpenSnackbar(displayError, 'error');
    setIsLoading(false);
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setScannerReady(false);
      setIsLoading(false);
      setErrorMessage(null);
      setDebugInfo('');
    }
  }, [isOpen]); 

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/20 bg-black/30" />
      <div className="relative z-50 w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
        <h3 className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
          Scan Barcode
          <button
            type="button"
            className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
            onClick={onClose}
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </h3>

        <div className="mt-4">
          {!scannerReady && !isLoading && !errorMessage && (
            <div className="flex flex-col justify-center items-center h-[250px] mt-2">
              <div className="text-center mb-6">
                <p className="text-gray-700 font-medium mb-2 text-lg">📸 Camera Access Required</p>
                <p className="text-sm text-gray-600 px-4">
                  Tap the button below to start the camera.
                  <br />
                  Your browser will ask for permission - tap <strong>Allow</strong>.
                </p>
              </div>
              <button
                onClick={startScanner}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-semibold text-lg cursor-pointer shadow-lg"
              >
                📷 Start Camera Scanner
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col justify-center items-center h-[250px] mt-2">
              <LoaderCircle className="animate-spin h-10 w-10 text-blue-600" />
              <p className="mt-4 text-gray-600 font-medium">Starting camera...</p>
              <p className="mt-2 text-xs text-gray-500">If prompted, please allow camera access</p>
            </div>
          )}

          {debugInfo && !errorMessage && scannerReady && (
            <div className="text-left mt-2 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-xs">
              <p className="font-semibold mb-1">✅ Camera Ready</p>
              <pre className="whitespace-pre-line font-mono">{debugInfo}</pre>
            </div>
          )}

          {errorMessage && (
            <div className="text-left mt-2 p-4 bg-red-50 text-red-700 rounded-lg border-2 border-red-400 max-h-[70vh] overflow-y-auto">
              <p className="font-bold mb-3 text-lg">⚠️ Camera Error</p>
              <div className="text-sm leading-relaxed whitespace-pre-line bg-white p-4 rounded border border-red-200 mb-3">
                {errorMessage}
              </div>
              
              <button
                onClick={startScanner}
                className="mt-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold cursor-pointer"
              >
                🔄 Try Again
              </button>
              
              {debugInfo && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer font-semibold hover:underline">📋 Show Technical Details</summary>
                  <pre className="mt-2 whitespace-pre-line bg-red-100 p-2 rounded text-xs">{debugInfo}</pre>
                </details>
              )}
            </div>
          )}

          {scannerReady && !errorMessage && (
            <>
              <div id={QRCODE_REGION_ID} className="w-full mt-2 min-h-[250px] border rounded-lg overflow-hidden" />
              <p className="mt-4 text-sm text-center text-gray-500 font-medium">
                📱 Position a barcode inside the scanning area
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraScannerModal;