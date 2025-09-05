import React, { ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ParallaxBackgroundProps {
  children: ReactNode;
  speed?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({ 
  children, 
  speed = 0.5,
  direction = 'up',
  className,
  style
}) => {
  const { scrollYProgress } = useScroll();
  
  const getTransform = () => {
    const baseTransform = useTransform(scrollYProgress, [0, 1], [0, -100 * speed]);
    
    switch (direction) {
      case 'up':
        return useTransform(scrollYProgress, [0, 1], [0, -100 * speed]);
      case 'down':
        return useTransform(scrollYProgress, [0, 1], [0, 100 * speed]);
      case 'left':
        return useTransform(scrollYProgress, [0, 1], [0, -100 * speed]);
      case 'right':
        return useTransform(scrollYProgress, [0, 1], [0, 100 * speed]);
      default:
        return baseTransform;
    }
  };

  const y = direction === 'up' || direction === 'down' ? getTransform() : 0;
  const x = direction === 'left' || direction === 'right' ? getTransform() : 0;

  return (
    <motion.div
      className={className}
      style={{
        ...style,
        y,
        x
      }}
    >
      {children}
    </motion.div>
  );
};

export default ParallaxBackground;
