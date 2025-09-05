import React, { ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';

interface StaggerAnimationProps {
  children: ReactNode;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale';
  className?: string;
}

const StaggerAnimation: React.FC<StaggerAnimationProps> = ({ 
  children, 
  staggerDelay = 0.1,
  direction = 'up',
  className
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const getInitialAnimation = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: 60, scale: 0.9 };
      case 'down':
        return { opacity: 0, y: -60, scale: 0.9 };
      case 'left':
        return { opacity: 0, x: 60, scale: 0.9 };
      case 'right':
        return { opacity: 0, x: -60, scale: 0.9 };
      case 'scale':
        return { opacity: 0, scale: 0.8 };
      default:
        return { opacity: 0, y: 60, scale: 0.9 };
    }
  };

  const getAnimateAnimation = () => {
    return { opacity: 1, x: 0, y: 0, scale: 1 };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: getInitialAnimation(),
    visible: getAnimateAnimation()
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StaggerAnimation;
