import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { Button, ButtonProps } from '@mui/material';

interface InteractiveButtonProps extends ButtonProps {
  children: React.ReactNode;
  animationType?: 'bounce' | 'glow' | 'scale' | 'slide';
  intensity?: 'subtle' | 'medium' | 'strong';
}

const InteractiveButton: React.FC<InteractiveButtonProps> = ({ 
  children, 
  animationType = 'scale',
  intensity = 'medium',
  sx,
  ...props 
}) => {
  const getAnimationProps = (): MotionProps => {
    const baseTransition = {
      type: "spring" as const,
      stiffness: 400,
      damping: 17
    };

    const intensityMultiplier = {
      subtle: 0.5,
      medium: 1,
      strong: 1.5
    };

    const multiplier = intensityMultiplier[intensity];

    switch (animationType) {
      case 'bounce':
        return {
          whileHover: { 
            scale: 1 + (0.05 * multiplier),
            y: -2 * multiplier
          },
          whileTap: { 
            scale: 1 - (0.05 * multiplier),
            y: 0
          },
          transition: baseTransition
        };

      case 'glow':
        return {
          whileHover: { 
            scale: 1 + (0.03 * multiplier),
            boxShadow: `0 0 ${20 * multiplier}px rgba(59, 130, 246, ${0.5 * multiplier})`
          },
          whileTap: { 
            scale: 1 - (0.02 * multiplier)
          },
          transition: baseTransition
        };

      case 'scale':
        return {
          whileHover: { 
            scale: 1 + (0.05 * multiplier)
          },
          whileTap: { 
            scale: 1 - (0.05 * multiplier)
          },
          transition: baseTransition
        };

      case 'slide':
        return {
          whileHover: { 
            x: 5 * multiplier,
            scale: 1 + (0.02 * multiplier)
          },
          whileTap: { 
            x: 0,
            scale: 1 - (0.02 * multiplier)
          },
          transition: baseTransition
        };

      default:
        return {
          whileHover: { scale: 1.05 },
          whileTap: { scale: 0.95 },
          transition: baseTransition
        };
    }
  };

  return (
    <motion.div
      {...getAnimationProps()}
      style={{ display: 'inline-block' }}
    >
      <Button
        {...props}
        sx={{
          ...sx,
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {children}
      </Button>
    </motion.div>
  );
};

export default InteractiveButton;
