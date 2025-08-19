import React, { ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';

const AnimatedSection: React.FC<{ children: ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, delay }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedSection;