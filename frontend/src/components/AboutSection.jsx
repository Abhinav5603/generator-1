import React from 'react';

const AboutSection = () => (
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
);

export default AboutSection;
