import React, { useState } from 'react';
import { Brain, Home, Lightbulb, Info, Menu, X, Sparkles, Clock } from 'lucide-react';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/question-history-public");
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Fetched history:", data);
      
      // Ensure data is an array before setting state
      setHistory(Array.isArray(data) ? data : []);
      setShowHistory(true);
    } catch (err) {
      console.error("Error fetching history:", err);
      // Show empty history in case of error
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavClick = (section) => {
    setIsMobileMenuOpen(false);
    if (section === 'Home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'About') {
      document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'Features') {
      document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'History') {
      fetchHistory(); // Load history modal
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

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-xl w-full rounded-lg shadow-lg p-6 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Generated Questions History</h3>
              <button 
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            {isLoading ? (
              <div className="py-16 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500">No question history found.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {history.map((entry, idx) => (
                  <li key={idx} className="border border-gray-300 rounded-md p-3">
                    <div className="text-sm text-gray-500 mb-2">
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "No timestamp"}
                    </div>
                    <ul className="list-disc pl-5 text-gray-800">
                      {Array.isArray(entry.questions) ? 
                        entry.questions.map((q, i) => (
                          <li key={i}>{q}</li>
                        )) : 
                        <li>No questions available</li>
                      }
                    </ul>
                  </li>
                ))}
              </ul>
            )}
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowHistory(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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