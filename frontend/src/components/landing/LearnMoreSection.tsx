import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const LearnMoreSection: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    "Advanced customer search and quote management",
    "Smart run system for optimized warehouse operations",
    "Barcode scanning with 100% accuracy guarantee",
    "Comprehensive user management and security"
  ];

  const benefits = [
    "Eliminate picking errors completely",
    "Streamline warehouse operations",
    "Seamless QuickBooks integration",
    "Mobile-first design for warehouse staff"
  ];

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">

          <div>
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
                Discover Smart Picker&apos;s Full Potential
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                Learn how our comprehensive warehouse management platform combines advanced customer search, 
                intelligent run systems, barcode validation, and seamless QuickBooks integration to 
                revolutionize your order fulfillment process.
              </p>
              
              <ul className="space-y-3 mb-8">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"></div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate("/about-us")}
                className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-blue-500 text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-300 cursor-pointer"
              >
                Learn More About Smart Picker
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </AnimatedSection>
          </div>

          <div>
            <AnimatedSection delay={0.2}>
              <div className="bg-gradient-to-br from-blue-800 to-blue-500 rounded-2xl p-8 text-white text-center shadow-2xl">
                <h3 className="text-2xl font-bold mb-6">
                  Why Choose Smart Picker?
                </h3>
                <ul className="space-y-4 inline-block text-left">
                  {benefits.map((benefit, index) => (
                     <li key={index} className="flex items-center gap-3">
                       <CheckCircle className="w-6 h-6 text-white flex-shrink-0" />
                       <span className="text-lg">{benefit}</span>
                     </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>
          </div>

        </div>
      </div>
    </section>
  );
};

export default LearnMoreSection;