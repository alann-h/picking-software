import React, { ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';

interface AnimatedSectionProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  duration?: number;
  className?: string;
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({ 
  children, 
  delay = 0, 
  direction = 'up',
  duration = 0.8,
  className
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const getInitialAnimation = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: 80, scale: 0.9 };
      case 'down':
        return { opacity: 0, y: -80, scale: 0.9 };
      case 'left':
        return { opacity: 0, x: 80, scale: 0.9 };
      case 'right':
        return { opacity: 0, x: -80, scale: 0.9 };
      case 'scale':
        return { opacity: 0, scale: 0.8 };
      default:
        return { opacity: 0, y: 80, scale: 0.9 };
    }
  };

  const getAnimateAnimation = () => {
    return { opacity: 1, x: 0, y: 0, scale: 1 };
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={getInitialAnimation()}
      animate={isInView ? getAnimateAnimation() : getInitialAnimation()}
      transition={{ 
        duration, 
        delay,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedSection;