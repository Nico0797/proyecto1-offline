import React, { useEffect } from 'react';
import { Hero } from '../components/Landing/Hero';
import { Features } from '../components/Landing/Features';
import { HowItWorks } from '../components/Landing/HowItWorks';
import { Pricing } from '../components/Landing/Pricing';
import { ComparisonTable } from '../components/Landing/ComparisonTable';
import { Testimonials } from '../components/Landing/Testimonials';
import { FAQ } from '../components/Landing/FAQ';
import { Footer } from '../components/Landing/Footer';

export const LandingPage = () => {
  // Add dark mode class on mount to ensure correct styling
  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    // Enable page scrolling on landing (global CSS locks body scroll for app pages)
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden font-sans">
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <ComparisonTable />
      <Testimonials />
      <FAQ />
      <Footer />
      
      {/* Sticky Mobile CTA */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 animate-fade-in-up">
        <a 
          href="#pricing" 
          className="block w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-center rounded-xl shadow-lg shadow-blue-900/50 backdrop-blur-sm border border-white/10"
        >
          Ver planes y precios
        </a>
      </div>
    </div>
  );
};

export default LandingPage;
