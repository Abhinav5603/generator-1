import React, { useState } from 'react';
import { FileUp, Mic } from 'lucide-react';
import Navbar from './components/Navbar';
import QuestionGenerator from './components/QuestionGenerator';

function App() {
  const [activeTab, setActiveTab] = useState('resume');
  
    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 to-black">
          {/* Background Video */}
          <video
            autoPlay
            loop
            muted
            className="absolute w-full h-full object-cover opacity-30"
          >
            <source
              src="https://cdn.coverr.co/videos/coverr-typing-on-computer-keyboard-2684/1080p.mp4"
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
    
          {/* Animated Background Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-purple-500/10 animate-gradient"></div>
    
          {/* Content */}
          <div className="relative z-10">
            <Navbar />
    
            <main className="container mx-auto px-4 pt-24">
              {/* Header */}
              <div className="text-center mb-16 space-y-6">
                <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  AI Interview Assistant
                </h1>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                  Transform your interview preparation with AI-generated questions tailored to your profile.
                  Choose your preferred input method below to get started.
                </p>
              </div>
    
              {/* Method Selection */}
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
    
              {/* Question Generator */}
              <QuestionGenerator mode={activeTab} />
            </main>
    
            {/* Features Section */}
            <section id="features-section" className="container mx-auto px-4 py-24">
              <div className="max-w-4xl mx-auto text-center space-y-6">
                <h2 className="text-4xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Features
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  InterviewAI blends modern web technologies and NLP techniques to help users simulate real interview situations.
                </p>
    
                <div className="text-left space-y-6 max-w-3xl mx-auto text-gray-300">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">🔍 Smart Resume Analysis</h3>
                    <p>
                    <li>Upload resume and receive tailored interview questions</li>
              <li>Voice-based question generation using speech input</li>
              <li>Smart analysis using AI/NLP techniques</li>
              <li>Instant question generation in seconds</li>
              <li>User-friendly drag & drop interface</li>
              <li>Beautifully designed with animations and themes</li>
                    </p>
                  </div>
                </div>
              </div>
            </section>
    
            {/* About Section */}
            <section id="about-section" className="container mx-auto px-4 py-24">
              <div className="max-w-4xl mx-auto text-center space-y-6">
                <h2 className="text-4xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  About InterviewAI
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  InterviewAI is a smart tool designed to help candidates prepare for job interviews by simulating a real-world Q&A session using artificial intelligence.
                </p>
    
                <div className="text-left text-gray-300 space-y-6 max-w-3xl mx-auto">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">🎯 Purpose</h3>
                    <p>To empower candidates with the right preparation tools by offering AI-curated questions tailored to their profile and career goals.</p>
                  </div>
    
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">👥 Target Audience</h3>
                    <ul className="list-disc list-inside text-gray-400 space-y-1">
                      <li>University students preparing for placements</li>
                      <li>Job seekers transitioning between roles</li>
                      <li>Professionals preparing for leadership interviews</li>
                      <li>Career counselors and bootcamp instructors</li>
                    </ul>
                  </div>
    
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">💡 How It Helps</h3>
                    <p>By offering personalized, AI-driven mock questions based on user data—InterviewAI mimics the thinking of real interviewers to challenge and coach users before the real event.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      );
    }
    
    export default App;
    