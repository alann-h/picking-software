import React, { useEffect, useRef, useState } from 'react';
import { Modal, Box, Typography, IconButton, CircularProgress } from '@mui/material';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbarContext } from './SnackbarContext';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90vw', sm: '80vw', md: 500 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '10px',
  maxHeight: '90vh',
  overflowY: 'auto',
};

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
          handleOpenSnackbar("No rear camera found. Using front camera if available.", 'warning');
        }

        setIsLoading(false);

        startScannerTimeoutId.current = window.setTimeout(async () => {
          const readerElement = document.getElementById(QRCODE_REGION_ID);
          if (!readerElement) {
            setErrorMessage("Scanner display area not found. Please try again.");
            handleOpenSnackbar("Scanner display area not found. Cannot start scanner.", 'error');
            return;
          }

          // Initialize Html5Qrcode only if it hasn't been already
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
    <Modal open={isOpen} onClose={onClose}>
      <Box sx={modalStyle}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            Scan Barcode
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 250, mt: 2 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Initializing camera...</Typography>
          </Box>
        )}

        {errorMessage && (
          <Box sx={{ textAlign: 'center', mt: 2, color: 'error.main' }}>
            <Typography variant="body1">{errorMessage}</Typography>
          </Box>
        )}

        {/* The QR code region is only rendered when not loading and no error,
            ensuring Html5Qrcode has an element to attach to. */}
        {!isLoading && !errorMessage && (
          <Box id={QRCODE_REGION_ID} sx={{ width: '100%', mt: 2, minHeight: 250 }} />
        )}

        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Position a barcode inside the scanning area.
        </Typography>
      </Box>
    </Modal>
  );
};

export default CameraScannerModal;