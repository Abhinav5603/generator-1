import React, { useState } from 'react';
import { Brain, Home, Lightbulb, Info, Menu, X, Sparkles, Clock } from 'lucide-react';
import HistoryModal from './HistoryModal'; // Import the new component

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleNavClick = (section) => {
    setIsMobileMenuOpen(false);
    if (section === 'Home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'About') {
      document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'Features') {
      document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'History') {
      setShowHistory(true); // Show history modal
    }
  };

  return (
    <>
      <nav className="fixed w-full z-20 top-0">
        <div className="bg-black/30 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-20">
              {/* Logo */}
              <div className="flex items-center gap-4 group">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-75 group-hover:opacity-100 blur transition duration-500 animate-spin-slow"></div>
                  <div className="relative p-2 bg-black rounded-full">
                    <Brain className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    InterviewAI
                  </span>
                  <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-8">
                <NavLink icon={<Home size={18} />} text="Home" onClick={() => handleNavClick('Home')} />
                <NavLink icon={<Lightbulb size={18} />} text="Features" onClick={() => handleNavClick('Features')} />
                <NavLink icon={<Clock size={18} />} text="History" onClick={() => handleNavClick('History')} />
                <NavLink icon={<Info size={18} />} text="About" onClick={() => handleNavClick('About')} />
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden relative group p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-50 blur transition duration-200"></div>
                <div className="relative">
                  {isMobileMenuOpen ? (
                    <X size={24} className="text-white transition-transform duration-200 transform rotate-90 group-hover:rotate-180" />
                  ) : (
                    <Menu size={24} className="text-white transition-transform duration-200 transform group-hover:rotate-180" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden absolute w-full bg-black/95 backdrop-blur-md border-b border-white/10 transition-all duration-500 ${
            isMobileMenuOpen
              ? 'opacity-100 translate-y-0 transform-gpu'
              : 'opacity-0 -translate-y-full pointer-events-none transform-gpu'
          }`}
        >
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-4">
              <NavLink icon={<Home size={18} />} text="Home" onClick={() => handleNavClick('Home')} isMobile />
              <NavLink icon={<Lightbulb size={18} />} text="Features" onClick={() => handleNavClick('Features')} isMobile />
              <NavLink icon={<Clock size={18} />} text="History" onClick={() => handleNavClick('History')} isMobile />
              <NavLink icon={<Info size={18} />} text="About" onClick={() => handleNavClick('About')} isMobile />
            </div>
          </div>
        </div>
      </nav>

      {/* History Modal Component */}
      <HistoryModal showHistory={showHistory} setShowHistory={setShowHistory} />
    </>
  );
};

const NavLink = ({ icon, text, onClick, isMobile }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 transition-all duration-300 relative group ${
      isMobile ? 'py-3 px-4 rounded-lg hover:bg-white/5 w-full text-left' : ''
    } text-gray-400 hover:text-white`}
  >
    <span className="relative">{icon}</span>
    <span className="relative">{text}</span>
  </button>
);

export default Navbar;