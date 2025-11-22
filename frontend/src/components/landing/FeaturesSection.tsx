import React, { useState, useEffect, useCallback } from 'react';
import { Smartphone, CloudCog, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

interface Feature {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  gradient: string;
}

const features: Feature[] = [
  {
    id: 0,
    icon: <Smartphone size={64} strokeWidth={2} />,
    title: "Mobile-First Design",
    description: "Scan barcodes and manage inventory directly from your smartphone or tablet. No more paper-based processes. Work from anywhere in your warehouse with a device that fits in your pocket.",
    color: "from-blue-600 to-indigo-600",
    gradient: "bg-gradient-to-br from-blue-50 to-indigo-50",
  },
  {
    id: 1,
    icon: <CloudCog size={64} strokeWidth={2} />,
    title: "Real-Time Sync",
    description: "All your data syncs instantly across devices and integrates seamlessly with QuickBooks Online. Never worry about outdated information or manual data entry again.",
    color: "from-purple-600 to-pink-600",
    gradient: "bg-gradient-to-br from-purple-50 to-pink-50",
  },
  {
    id: 2,
    icon: <ClipboardList size={64} strokeWidth={2} />,
    title: "Run-Based System",
    description: "Group orders into efficient 'runs' for pickers to prepare multiple orders simultaneously, maximizing warehouse productivity. Turn hours of work into minutes.",
    color: "from-emerald-600 to-teal-600",
    gradient: "bg-gradient-to-br from-emerald-50 to-teal-50",
  },
];

const FeaturesSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Auto-play functionality
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setSlideDirection('right');
      setActiveIndex((current) => (current + 1) % features.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [isPaused]);

  const goToSlide = useCallback((index: number) => {
    setSlideDirection(index > activeIndex ? 'right' : 'left');
    setActiveIndex(index);
  }, [activeIndex]);

  const goToPrevious = useCallback(() => {
    setSlideDirection('left');
    setActiveIndex((current) => (current - 1 + features.length) % features.length);
  }, []);

  const goToNext = useCallback(() => {
    setSlideDirection('right');
    setActiveIndex((current) => (current + 1) % features.length);
  }, []);

  // Touch handlers for swipe gestures
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  const activeFeature = features[activeIndex];

  return (
    <section className="py-16 md:py-24 px-4 sm:px-8 bg-slate-50">
      <div className="max-w-screen-xl mx-auto">
        <AnimatedSection>
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              Why Choose Smart Picker?
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Built for modern businesses that need efficiency, accuracy, and simplicity
            </p>
          </div>
        </AnimatedSection>

        {/* Carousel Container */}
        <div 
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Main Feature Display */}
          <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-white min-h-[400px] md:min-h-[450px]">
            {/* Animated Feature Card with Slide Transition */}
            <div 
              key={activeIndex}
              className={`absolute inset-0 ${activeFeature.gradient} ${
                slideDirection === 'right' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
              }`}
            >
              <div className="h-full flex flex-col md:flex-row items-center justify-between p-8 md:px-16 md:py-12 lg:px-20 lg:py-16 gap-8 md:gap-12">
                {/* Icon Section */}
                <div className="flex-shrink-0 md:ml-8">
                  <div 
                    className={`bg-gradient-to-br ${activeFeature.color} text-white rounded-3xl p-8 md:p-12 shadow-xl transform transition-all duration-500 hover:scale-110 hover:rotate-3`}
                  >
                    {activeFeature.icon}
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 text-center md:text-left max-w-2xl md:mr-4">
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    {activeFeature.title}
                  </h3>
                  <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                    {activeFeature.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={goToPrevious}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 z-10 cursor-pointer"
              aria-label="Previous feature"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 z-10 cursor-pointer"
              aria-label="Next feature"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Tab Navigation with Smooth Progress - Desktop */}
          <div className="hidden md:flex justify-center items-center gap-3 mt-8 mb-8">
            {features.map((feature, index) => {
              const isActive = index === activeIndex;
              const targetWidth = isActive ? 200 : 48; // 200px for active, 48px (w-12) for inactive
              
              return (
                <button
                  key={feature.id}
                  onClick={() => goToSlide(index)}
                  className="group relative focus:outline-none"
                  style={{
                    width: `${targetWidth}px`,
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  aria-label={`Go to ${feature.title}`}
                >
                  <div
                    className={`relative h-2 rounded-full overflow-hidden ${
                      isActive
                        ? `bg-gradient-to-r ${feature.color} shadow-lg`
                        : 'bg-gray-300 group-hover:bg-gray-400'
                    }`}
                    style={{
                      transition: 'background-color 0.4s ease, box-shadow 0.4s ease'
                    }}
                  >
                      {/* Progress bar for active slide - smooth animation */}
                      {isActive && !isPaused && (
                        <div 
                          key={`progress-${activeIndex}`}
                          className="absolute inset-0 bg-white/30 rounded-full origin-left"
                          style={{
                            animation: 'fillProgress 5s linear forwards'
                          }}
                        />
                      )}
                  </div>
                  {/* Tab label - only show for active */}
                  {isActive && (
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap animate-fadeIn">
                      {feature.title}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Navigation - Dots with Progress */}
          <div className="flex md:hidden flex-col items-center gap-4 mt-8 mb-8">
            {/* Current feature title */}
            <div className="text-sm font-medium text-gray-700 text-center">
              {features[activeIndex].title}
            </div>
            
            {/* Dots with progress bar */}
            <div className="flex justify-center items-center gap-3">
              {features.map((feature, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={`mobile-${feature.id}`}
                    onClick={() => goToSlide(index)}
                    className="relative focus:outline-none"
                    aria-label={`Go to ${feature.title}`}
                  >
                    <div
                      className={`w-10 h-2 rounded-full overflow-hidden transition-all duration-400 ${
                        isActive
                          ? `bg-gradient-to-r ${feature.color} shadow-md`
                          : 'bg-gray-300'
                      }`}
                    >
                      {/* Progress bar for active slide */}
                      {isActive && !isPaused && (
                        <div 
                          key={`mobile-progress-${activeIndex}`}
                          className="absolute inset-0 bg-white/30 rounded-full origin-left"
                          style={{
                            animation: 'fillProgress 5s linear forwards'
                          }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Custom CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fillProgress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slideInFromRight {
          animation: slideInFromRight 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-slideInFromLeft {
          animation: slideInFromLeft 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </section>
  );
};

export default FeaturesSection;

