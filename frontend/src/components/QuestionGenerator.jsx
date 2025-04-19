import React, { useState } from 'react';
import { FileUp, Mic, Loader2, AlertCircle, X, Download } from 'lucide-react';
import jsPDF from 'jspdf';

const QuestionGenerator = ({ mode, theme }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [skills, setSkills] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  
  // For voice input
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);

  const handleResumeUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file) => {
    setIsLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Change the endpoint to use the public version that doesn't require authentication
      const response = await fetch('http://localhost:5000/api/upload-resume-public', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Error uploading resume');
      }
      
      const data = await response.json();
      setQuestions(data.questions);
      setSkills(data.skills);
    } catch (err) {
      setError('Failed to process your resume. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setError('');
    
    // Check browser support for Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in your browser.');
      setIsRecording(false);
      return;
    }
    
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';
    
    recognitionInstance.onstart = () => {
      setTranscript('');
    };
    
    recognitionInstance.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      setTranscript(finalTranscript + interimTranscript);
    };
    
    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };
    
    recognitionInstance.start();
    setRecognition(recognitionInstance);
  };

  const stopRecording = async () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    
    setIsRecording(false);
    
    if (transcript.trim()) {
      setIsLoading(true);
      
      try {
        // Using the public endpoint for voice processing
        const response = await fetch('http://localhost:5000/api/process-voice-public', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transcription: transcript }),
        });
        
        if (!response.ok) {
          throw new Error('Error processing voice input');
        }
        
        const data = await response.json();
        setQuestions(data.questions);
        setSkills(data.skills);
      } catch (err) {
        setError('Failed to process your voice input. Please try again.');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('No speech detected. Please try again.');
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const exportToPDF = () => {
    if (questions.length === 0) {
      setError('No questions to export. Please generate questions first.');
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Generated Interview Questions', 105, 20, { align: 'center' });
    
    // Add skills section
    if (skills.length > 0) {
      doc.setFontSize(12);
      doc.text('Skills:', 15, 35);
      doc.setFontSize(10);
      const skillsText = skills.join(', ');
      doc.text(skillsText, 15, 45);
    }
    
    // Add questions
    doc.setFontSize(12);
    doc.text('Questions:', 15, 65);
    
    let currentY = 75;
    questions.forEach((question, index) => {
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${question}`, 15, currentY);
      currentY += 10;
    });
    
    // Save the PDF
    doc.save('interview-questions.pdf');
  };

  return (
    <div className="max-w-3xl mx-auto">
      {error && (
        <div className="flex justify-between items-center gap-3 text-white bg-red-500/20 backdrop-blur-md rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      <div 
        className={`relative bg-white/5 backdrop-blur-md rounded-2xl p-8 mb-12 transition-all duration-300
          ${dragActive ? 'border-2 border-blue-500 bg-blue-500/10' : 'border-2 border-white/10'}
        `}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {mode === 'resume' ? (
          <div className="text-center">
            <label className="block">
              <div className="flex flex-col items-center gap-6 cursor-pointer">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-75 group-hover:opacity-100 blur transition duration-200"></div>
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                    <FileUp className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div className="text-white">
                  <span className="text-xl font-semibold block mb-2">Upload your resume</span>
                  <p className="text-gray-400">
                    Drag & drop your file here or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supported formats: PDF, DOC, DOCX (Max 5MB)
                  </p>
                </div>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
              />
            </label>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={toggleRecording}
              className="relative group outline-none"
            >
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-75 group-hover:opacity-100 blur transition duration-200"></div>
              <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
                ${isRecording 
                  ? 'bg-gradient-to-br from-red-600 to-red-800 animate-pulse' 
                  : 'bg-gradient-to-br from-purple-600 to-purple-800'}`}
              >
                <Mic className="w-10 h-10 text-white" />
              </div>
            </button>
            <p className="text-xl font-semibold text-white mt-6">
              {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
            </p>
            <p className="text-gray-400 mt-2">
              Speak clearly about your experience and skills
            </p>
            
            {isRecording && transcript && (
              <div className="mt-6 p-4 bg-white/10 rounded-lg text-left">
                <p className="text-sm text-white/70 mb-2">Your speech:</p>
                <p className="text-white">{transcript}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center gap-3 text-white bg-white/5 backdrop-blur-md rounded-xl p-6">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-lg">Analyzing your profile...</span>
        </div>
      )}

      {questions.length > 0 && !isLoading && (
        <div className="space-y-6 mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
            <h2 className="text-2xl font-bold text-white">
              Your Interview Questions
            </h2>
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
            >
              <Download className="w-5 h-5" />
              Export to PDF
            </button>
          </div>
          
          {skills.length > 0 && (
            <div className="mb-6 p-4 bg-white/10 rounded-lg">
              <p className="text-sm text-white/70 mb-2">Identified Skills:</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span 
                    key={index} 
                    className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid gap-4">
            {questions.map((question, index) => (
              <div
                key={index}
                className="group bg-white/5 backdrop-blur-md rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 font-medium">{index + 1}</span>
                  </div>
                  <p className="text-lg text-white leading-relaxed">{question}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-500/10 rounded-lg flex items-center gap-3 text-blue-400">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">
              Pro tip: Take a moment to structure your thoughts before answering each question.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionGenerator;