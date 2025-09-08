import React, { ReactNode } from 'react';
import { motion, Transition } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Removed to fix crash in environments without a router
import AnimatedSection from './landing/AnimatedSection';

interface InteractiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  animationType?: 'scale' | 'bounce' | 'glow' | 'slide';
  intensity?: 'subtle' | 'medium' | 'strong';
  variant?: 'primary' | 'secondary';
}

// --- InteractiveButton Component ---
const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  children,
  onClick,
  className = '',
  animationType = 'scale',
  intensity = 'medium',
  variant = 'primary'
}) => {
  const getAnimationProps = () => {
    const baseTransition: Transition = { type: "spring", stiffness: 400, damping: 17 };
    const intensityMultiplier: Record<string, number> = { subtle: 0.5, medium: 1, strong: 1.5 };
    const multiplier = intensityMultiplier[intensity];

    switch (animationType) {
      case 'bounce': return { whileHover: { scale: 1 + (0.05 * multiplier), y: -2 * multiplier }, whileTap: { scale: 1 - (0.05 * multiplier), y: 0 }, transition: baseTransition };
      case 'glow': return { whileHover: { scale: 1 + (0.03 * multiplier), boxShadow: `0 0 ${20 * multiplier}px rgba(59, 130, 246, ${0.4 * multiplier})` }, whileTap: { scale: 1 - (0.02 * multiplier) }, transition: baseTransition };
      case 'slide': return { whileHover: { x: 5 * multiplier, scale: 1 + (0.02 * multiplier) }, whileTap: { x: 0, scale: 1 - (0.02 * multiplier) }, transition: baseTransition };
      case 'scale': default: return { whileHover: { scale: 1 + (0.05 * multiplier) }, whileTap: { scale: 1 - (0.05 * multiplier) }, transition: baseTransition };
    }
  };

  const baseClasses = "flex items-center justify-center px-6 py-3 rounded-lg text-base font-semibold duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400"
  };

  return (
    <motion.button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...getAnimationProps()}
    >
      {children}
    </motion.button>
  );
};

// --- Icons ---
const ArrowForwardIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
);
const BarcodeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>
);

// --- Hero Component ---
const Hero: React.FC = () => {
  const navigate = useNavigate(); // This should be used in the parent component that has a Router context
  return (
    <main className="min-h-screen bg-gray-50 text-gray-800 flex items-center">
      <div className="container mx-auto px-6 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <AnimatedSection direction="up">
              <div className="inline-flex items-center bg-blue-100 text-blue-700 text-sm font-bold px-4 py-1 rounded-full mb-4">
                <BarcodeIcon className="w-4 h-4 mr-2" />
                Inventory Management, Reimagined
              </div>
            </AnimatedSection>
            
            <AnimatedSection delay={0.1} direction="up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
                Goodbye mistakes,
                <br />
                <span className="text-blue-600">hello Smart Picker.</span>
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={0.2} direction="up">
              <p className="text-lg md:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 mb-8">
                Streamline your warehouse operations with our intelligent picking system.
                Increase accuracy, save time, and manage stock from any device, anywhere.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.3} direction="up">
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <InteractiveButton
                  onClick={() => { navigate("/login") }}
                  animationType="bounce"
                  intensity="medium"
                  variant="primary"
                >
                  Get Started Free <ArrowForwardIcon />
                </InteractiveButton>
                <InteractiveButton
                  onClick={() => { navigate("/demo") }}
                  animationType="scale"
                  intensity="subtle"
                  variant="secondary"
                >
                  Watch Demo
                </InteractiveButton>
              </div>
            </AnimatedSection>
          </div>

          {/* Image served and processed by Cloudflare from your S3 origin */}
          <AnimatedSection delay={0.2} direction="left" className="hidden lg:block">
            <div className="relative">
              <img 
                src="https://www.smartpicker.au/cdn-cgi/image/width=1600,format=auto,quality=95/https://smartpicker-images.s3.ap-southeast-1.amazonaws.com/smartpicker-dashboard.png"
                alt="Smart Picker inventory management software dashboard"
                className="rounded-2xl shadow-2xl border border-gray-100"
              />
               <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 4.293a1 1 0 011.414 1.414l-9 9a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 12.586l8.293-8.293z" /></svg>
               </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </main>
  );
};

export default Hero;

