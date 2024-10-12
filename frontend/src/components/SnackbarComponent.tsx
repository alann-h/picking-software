import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbarContext } from './SnackbarContext';

const SnackbarComponent: React.FC = () => {
  const { openSnackbar, handleCloseSnackbar, snackbarMessage, snackbarSeverity } = useSnackbarContext();

  const variants = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
  };

  return (
    <AnimatePresence>
      {openSnackbar && (
        <Snackbar
          open={openSnackbar}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          sx={{ height: 'auto' }}
        >
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            transition={{ duration: 0.3 }}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity={snackbarSeverity}
              sx={{ width: '100%' }}
            >
              {snackbarMessage}
            </Alert>
          </motion.div>
        </Snackbar>
      )}
    </AnimatePresence>
  );
};

export default SnackbarComponent;