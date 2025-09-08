import React, { useEffect, useRef, useState, Fragment } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
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
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await Html5Qrcode.getCameras();
        console.log("Available Cameras:", devices);

        if (!devices || devices.length === 0) {
          setErrorMessage("No cameras found on this device.");
          handleOpenSnackbar("No cameras found on this device.", 'error');
          setIsLoading(false);
          return;
        }

        let cameraIdToUse: string | undefined;
        const environmentCamera = devices.find(device =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('main')
        );

        if (environmentCamera) {
          cameraIdToUse = environmentCamera.id;
          console.log("Selected environment camera:", environmentCamera.label, environmentCamera.id);
        } else {
          cameraIdToUse = devices[0].id;
          console.warn("No 'environment/rear' camera found. Using the first available camera:", devices[0].label, devices[0].id);
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
        let displayError = "Failed to start camera.";
        if (err.name === "NotAllowedError") {
          displayError = "Camera access denied. Please grant permission in your browser settings.";
        } else if (err.name === "NotFoundError" || err.name === "OverconstrainedError") {
          displayError = "No suitable camera found or camera is in use by another application.";
        } else {
          displayError += ` Error: ${err.message || 'Unknown error'}`;
        }
        setErrorMessage(displayError);
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

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                >
                  Scan Barcode
                  <button
                    type="button"
                    className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6 text-gray-500" />
                  </button>
                </DialogTitle>

                <div className="mt-4">
                  {isLoading && (
                    <div className="flex flex-col justify-center items-center h-[250px] mt-2">
                      <LoaderCircle className="animate-spin h-10 w-10 text-gray-500" />
                      <p className="mt-4 text-gray-500">Initializing camera...</p>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="text-center mt-2 p-4 bg-red-50 text-red-700 rounded-lg">
                      <p>{errorMessage}</p>
                    </div>
                  )}

                  {!isLoading && !errorMessage && (
                    <div id={QRCODE_REGION_ID} className="w-full mt-2 min-h-[250px] border rounded-lg overflow-hidden" />
                  )}

                  <p className="mt-4 text-sm text-center text-gray-500">
                    Position a barcode inside the scanning area.
                  </p>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CameraScannerModal;