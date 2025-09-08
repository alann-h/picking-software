import React, { useRef, ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';

// --- Type Definitions ---
interface AnimatedSectionProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  duration?: number;
  className?: string;
}

// --- AnimatedSection Component ---
const AnimatedSection: React.FC<AnimatedSectionProps> = ({ 
  children, 
  delay = 0, 
  direction = 'up',
  duration = 0.8,
  className = ''
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const getInitialAnimation = () => {
    switch (direction) {
      case 'up': return { opacity: 0, y: 50 };
      case 'down': return { opacity: 0, y: -50 };
      case 'left': return { opacity: 0, x: 50 };
      case 'right': return { opacity: 0, x: -50 };
      case 'scale': return { opacity: 0, scale: 0.9 };
      default: return { opacity: 0, y: 50 };
    }
  };

  const getAnimateAnimation = () => ({ opacity: 1, x: 0, y: 0, scale: 1 });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={getInitialAnimation()}
      animate={isInView ? getAnimateAnimation() : {}}
      transition={{ 
        duration, 
        delay,
        type: "spring",
        stiffness: 100,
        damping: 20
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedSection;
