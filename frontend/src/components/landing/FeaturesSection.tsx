import React from 'react';
import { Smartphone, CloudCog, ClipboardList } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

interface FeatureRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  reverse?: boolean;
}

const FeatureRow: React.FC<FeatureRowProps> = ({ icon, title, description, reverse = false }) => (
  <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-12 mb-16 md:mb-24 last:mb-0`}>
    {/* Icon Side */}
    <div className="flex-shrink-0 w-full md:w-1/3 flex justify-center">
      <div className="bg-indigo-600 text-white rounded-2xl p-12 shadow-xl transform hover:scale-105 transition-transform duration-300">
        {icon}
      </div>
    </div>
    
    {/* Content Side */}
    <div className={`flex-1 ${reverse ? 'md:text-right' : 'md:text-left'} text-center`}>
      <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
        {title}
      </h3>
      <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto md:mx-0">
        {description}
      </p>
    </div>
  </div>
);

const FeaturesSection = () => (
  <section className="py-16 md:py-24 px-4 sm:px-8 bg-slate-50">
    <div className="max-w-screen-xl mx-auto">
      <AnimatedSection>
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Why Choose Smart Picker?
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Built for modern businesses that need efficiency, accuracy, and simplicity
          </p>
        </div>
      </AnimatedSection>

      <div className="space-y-0">
        <FeatureRow
          icon={<Smartphone size={48} strokeWidth={2} />}
          title="Mobile-First Design"
          description="Scan barcodes and manage inventory directly from your smartphone or tablet. No more paper-based processes."
          reverse={false}
        />
        <FeatureRow
          icon={<CloudCog size={48} strokeWidth={2} />}
          title="Real-Time Sync"
          description="All your data syncs instantly across devices and integrates seamlessly with QuickBooks Online."
          reverse={true}
        />
        <FeatureRow
          icon={<ClipboardList size={48} strokeWidth={2} />}
          title="Run-Based System"
          description="Group orders into efficient 'runs' for pickers to prepare multiple orders simultaneously, maximizing warehouse productivity."
          reverse={false}
        />
      </div>
    </div>
  </section>
);

export default FeaturesSection;

