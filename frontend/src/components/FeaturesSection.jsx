import React from 'react';

const FeaturesSection = () => (
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
          <ul className="list-disc list-inside text-gray-400 space-y-1">
            <li>Upload resume and receive tailored interview questions</li>
            <li>Voice-based question generation using speech input</li>
            <li>Smart analysis using AI/NLP techniques</li>
            <li>Instant question generation in seconds</li>
            <li>User-friendly drag & drop interface</li>
            <li>Beautifully designed with animations and themes</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export default FeaturesSection;
