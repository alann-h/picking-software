import React, { useEffect, useRef } from 'react';
import { Modal, Box, Typography, IconButton } from '@mui/material';
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
  borderRadius: '10px'
};

const QRCODE_REGION_ID = "reader";

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

const CameraScannerModal: React.FC<CameraScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const { handleOpenSnackbar } = useSnackbarContext();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Ref to hold the timeout ID
  const startTimeoutId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // --- FIX: Use setTimeout to delay scanner initialization ---
    // This ensures the DOM element is available before the library tries to access it.
    startTimeoutId.current = setTimeout(() => {
      // Initialize the scanner only if it doesn't exist yet.
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(QRCODE_REGION_ID, {
          verbose: false,
        });
      }

      const html5QrCode = html5QrCodeRef.current;

      if (html5QrCode.getState() === Html5QrcodeScannerState.NOT_STARTED) {
        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            if (!errorMessage.includes("NotFoundException")) {
              console.warn("QR Scanner Error:", errorMessage);
            }
          }
        ).catch(err => {
          handleOpenSnackbar("Failed to start scanner: " + err, 'error');
          console.error("Failed to start html5-qrcode scanner", err);
        });
      }
    }, 100); // A small delay like 100ms is robust. 0 would also work in most cases.

    // --- Cleanup function ---
    return () => {
      // Clear the timeout if the component unmounts before it fires
      if (startTimeoutId.current) {
        clearTimeout(startTimeoutId.current);
      }

      const html5QrCode = html5QrCodeRef.current;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => {
          console.error("Error stopping the scanner.", err);
        });
      }
    };
  }, [isOpen, onScanSuccess, handleOpenSnackbar]);

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
        {/* This element must be in the DOM when the library initializes */}
        <Box id={QRCODE_REGION_ID} sx={{ width: '100%', mt: 2 }} />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Position a barcode inside the scanning area.
        </Typography>
      </Box>
    </Modal>
  );
};

export default CameraScannerModal;