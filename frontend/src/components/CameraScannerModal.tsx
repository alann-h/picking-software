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

  const startTimeoutId = useRef<number | null>(null);
  const startScannerTimeoutId = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

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

  useEffect(() => {
    if (!isOpen) {
      if (startTimeoutId.current) {
        clearTimeout(startTimeoutId.current);
      }
      if (startScannerTimeoutId.current) {
        clearTimeout(startScannerTimeoutId.current);
      }
      stopScanner();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const initializeCameraAndRenderScanner = async () => {
      try {
        // First, request basic camera permission without constraints
        // This is more compatible with Samsung/Android devices
        let stream;
        try {
          // Try with just basic video permission first (works on all devices)
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          console.log("Camera permission granted");
        } catch (permError) {
          console.error("Failed to get camera permission:", permError);
          throw permError; // Re-throw to be caught by outer catch
        }
        
        // Stop the stream immediately - we just needed it for permission
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        // Now get the list of available cameras
        const devices = await Html5Qrcode.getCameras();
        console.log("Available Cameras:", devices);
        
        // Set debug info to show user what cameras were detected
        const cameraDebugInfo = devices.map((d, i) => `${i + 1}. ${d.label || 'Unnamed'} (ID: ${d.id})`).join('\n');
        setDebugInfo(`Found ${devices.length} camera(s):\n${cameraDebugInfo}`);

        if (!devices || devices.length === 0) {
          setErrorMessage("No cameras found on this device.");
          handleOpenSnackbar("No cameras found on this device.", 'error');
          setIsLoading(false);
          return;
        }

        // Samsung devices often label cameras like "camera2 0, facing back" or "Camera 0, Facing back"
        // iPhone uses "Back Camera" or contains "environment"
        // Let's check for multiple patterns
        let cameraIdToUse: string | undefined;
        
        // Try to find rear/back camera with multiple patterns
        const environmentCamera = devices.find(device => {
          const label = device.label.toLowerCase();
          return (
            label.includes('back') ||
            label.includes('rear') ||
            label.includes('environment') ||
            label.includes('facing back') ||  // Samsung specific
            label.includes('main') ||
            label.match(/camera\s*[0-9]+.*back/i) || // Pattern: "camera 0 back" or "camera2 0, facing back"
            (label.includes('camera') && label.includes('0') && !label.includes('front')) // Fallback for Samsung
          );
        });

        if (environmentCamera) {
          cameraIdToUse = environmentCamera.id;
          console.log("Selected back/rear camera:", environmentCamera.label, environmentCamera.id);
          setDebugInfo(prev => prev + `\n\n✓ Selected: ${environmentCamera.label}`);
        } else {
          // If we have multiple cameras, prefer the last one (usually back camera on mobile)
          const selectedCamera = devices.length > 1 ? devices[devices.length - 1] : devices[0];
          cameraIdToUse = selectedCamera.id;
          console.warn("No rear camera found by label. Using camera:", selectedCamera.label);
          setDebugInfo(prev => prev + `\n\n⚠️ No rear camera detected by label.\nUsing: ${selectedCamera.label}`);
        }

        setIsLoading(false);

        startScannerTimeoutId.current = window.setTimeout(async () => {
          const readerElement = document.getElementById(QRCODE_REGION_ID);
          if (!readerElement) {
            setErrorMessage("Scanner display area not found. Please try again.");
            handleOpenSnackbar("Scanner display area not found. Cannot start scanner.", 'error');
            return;
          }

          if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode(QRCODE_REGION_ID, {
              verbose: false,
            });
          }

          const html5QrCode = html5QrCodeRef.current;

          if (html5QrCode.getState() === Html5QrcodeScannerState.NOT_STARTED) {
            await html5QrCode.start(
              cameraIdToUse!,
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
            console.log("Scanner started successfully with ID:", cameraIdToUse);
          } else {
            console.log("Scanner is already running or in a non-startable state:", html5QrCode.getState());
          }
        }, 500) as unknown as number;

      } catch (err: any) {
        // Add detailed error info for debugging
        const errorDetails = `\n\nError Type: ${err.name || 'Unknown'}\nError Message: ${err.message || 'No message'}`;
        console.error("Camera error details:", err);
        
        let displayError = "Failed to start camera.";
        let helpText = "";
        
        if (err.name === "NotAllowedError") {
          displayError = "Camera permission denied.";
          // Detect if user is on Android/Samsung
          const isAndroid = /Android/i.test(navigator.userAgent);
          const isSamsung = /Samsung/i.test(navigator.userAgent);
          
          if (isAndroid || isSamsung) {
            helpText = "\n\n📱 For Samsung/Android:\n\n1. Tap the 🔒 (lock) or ⓘ icon in your browser's address bar\n2. Find 'Camera' and tap it\n3. Select 'Allow' instead of 'Block'\n4. Close this popup and try scanning again\n\nIf that doesn't work: Close the browser completely and reopen it, or check Settings → Apps → Chrome → Permissions → Camera";
          } else {
            helpText = "\n\nTap the lock icon (🔒) in your browser's address bar and allow camera access for this site.";
          }
        } else if (err.name === "NotFoundError") {
          displayError = "No camera found on this device.";
        } else if (err.name === "OverconstrainedError") {
          displayError = "Camera is in use by another application.";
          helpText = "\n\nPlease close other apps using the camera and try again.";
        } else if (err.name === "NotReadableError" || err.name === "AbortError") {
          displayError = "Camera hardware error.";
          helpText = "\n\nTry closing other apps using the camera, or restart your device.";
        } else {
          displayError += ` ${err.message || 'Unknown error'}`;
        }
        
        setErrorMessage(displayError + helpText + errorDetails);
        handleOpenSnackbar(displayError, 'error');
        console.error("Failed to initialize camera or scanner:", err);
        setIsLoading(false);
      }
    };
    if (startTimeoutId.current) {
      clearTimeout(startTimeoutId.current);
    }
    startTimeoutId.current = window.setTimeout(initializeCameraAndRenderScanner, 200) as unknown as number;

    return () => {
      if (startTimeoutId.current) {
        clearTimeout(startTimeoutId.current);
      }
      if (startScannerTimeoutId.current) {
        clearTimeout(startScannerTimeoutId.current);
      }
      stopScanner();
    };
  }, [isOpen, onScanSuccess, onClose, handleOpenSnackbar]); 

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
          {isLoading && (
            <div className="flex flex-col justify-center items-center h-[250px] mt-2">
              <LoaderCircle className="animate-spin h-10 w-10 text-gray-500" />
              <p className="mt-4 text-gray-500">Initializing camera...</p>
            </div>
          )}

          {debugInfo && !errorMessage && (
            <div className="text-left mt-2 p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-xs">
              <p className="font-semibold mb-1">📱 Debug Info:</p>
              <pre className="whitespace-pre-line font-mono">{debugInfo}</pre>
            </div>
          )}

          {errorMessage && (
            <div className="text-left mt-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              <p className="font-semibold mb-2">⚠️ Camera Error</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{errorMessage}</p>
              
              {debugInfo && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer font-semibold">Show Camera Debug Info</summary>
                  <pre className="mt-2 whitespace-pre-line bg-red-100 p-2 rounded">{debugInfo}</pre>
                </details>
              )}
            </div>
          )}

          {!isLoading && !errorMessage && (
            <div id={QRCODE_REGION_ID} className="w-full mt-2 min-h-[250px] border rounded-lg overflow-hidden" />
          )}

          <p className="mt-4 text-sm text-center text-gray-500">
            Position a barcode inside the scanning area.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CameraScannerModal;