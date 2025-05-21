import React from 'react';

const HeroHeader = () => (
  <div className="text-center mb-16 space-y-6">
    <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
      AI Interview Assistant
    </h1>
    <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
      Transform your interview preparation with AI-generated questions tailored to your profile.
      Choose your preferred input method below to get started.
    </p>
  </div>
);

export default HeroHeader;
