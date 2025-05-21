import React from 'react';
import { FileUp, Mic } from 'lucide-react';

const InputMethodTabs = ({ activeTab, setActiveTab }) => (
  <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
    <button
      onClick={() => setActiveTab('resume')}
      className={`relative group p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
        activeTab === 'resume'
          ? 'bg-gradient-to-br from-blue-600 to-blue-800 shadow-xl shadow-blue-500/20'
          : 'bg-white/5 hover:bg-white/10'
      }`}
      aria-pressed={activeTab === 'resume'}
    >
      <div className="flex items-center gap-4">
        <div className="p-4 rounded-xl bg-blue-500/20">
          <FileUp className={`w-8 h-8 ${activeTab === 'resume' ? 'text-white' : 'text-blue-400'}`} />
        </div>
        <div className="text-left">
          <h3 className="text-xl font-semibold text-white mb-2">Resume Analysis</h3>
          <p className="text-gray-400">Upload your resume for personalized questions</p>
        </div>
      </div>
    </button>

    <button
      onClick={() => setActiveTab('speech')}
      className={`relative group p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 ${
        activeTab === 'speech'
          ? 'bg-gradient-to-br from-purple-600 to-purple-800 shadow-xl shadow-purple-500/20'
          : 'bg-white/5 hover:bg-white/10'
      }`}
      aria-pressed={activeTab === 'speech'}
    >
      <div className="flex items-center gap-4">
        <div className="p-4 rounded-xl bg-purple-500/20">
          <Mic className={`w-8 h-8 ${activeTab === 'speech' ? 'text-white' : 'text-purple-400'}`} />
        </div>
        <div className="text-left">
          <h3 className="text-xl font-semibold text-white mb-2">Voice Input</h3>
          <p className="text-gray-400">Speak about your experience</p>
        </div>
      </div>
    </button>
  </div>
);

export default InputMethodTabs;
