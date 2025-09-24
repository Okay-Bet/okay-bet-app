import React from 'react';
import { useRouter } from 'next/navigation';

interface HeroSectionProps {
  onGetStarted?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  const router = useRouter();

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      const indexSection = document.getElementById('index-showcase');
      indexSection?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="text-center">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-8">
            Buy the Trends in
            <span className="text-primary font-bold"> Event Markets</span>
          </h1>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGetStarted}
              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              View Indexes
            </button>
            <button
              onClick={() => router.push('/groups')}
              className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
            >
              Create Your Own
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};