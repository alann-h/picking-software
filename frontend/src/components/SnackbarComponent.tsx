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

  const contentVariants = {
    error: {
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.5 },
    },
    success: {
      scale: [1, 1.1, 1],
      transition: { duration: 0.5 },
    },
  };

  return (
    <AnimatePresence>
      {openSnackbar && (
        <Snackbar
          open={openSnackbar}
          onClose={handleCloseSnackbar}
          sx={{ height: '1.25rem', m: '1.5rem 0' }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
          >
            <motion.div
              animate={snackbarSeverity === 'error' ? 'error' : 'success'}
              variants={contentVariants}
            >
              <Alert
                onClose={handleCloseSnackbar}
                severity={snackbarSeverity}
                sx={{ width: '100%' }}
              >
                {snackbarMessage}
              </Alert>
            </motion.div>
          </motion.div>
        </Snackbar>
      )}
    </AnimatePresence>
  );
};

export default SnackbarComponent;