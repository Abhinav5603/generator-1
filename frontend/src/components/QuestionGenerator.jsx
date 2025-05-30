import React, { useState } from 'react';
import { FileUp, Mic, Loader2, AlertCircle, X, Download, Send, Award, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';

const QuestionGenerator = ({ mode, theme }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [skills, setSkills] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [questionSetId, setQuestionSetId] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    setQuestions([]);
    setSkills([]);
    setAnsweredQuestions({});
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Use public endpoint for file processing
      const response = await fetch('https://generator-1-backend.onrender.com/api/upload-resume-public', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Error uploading resume: ${response.status}`);
      }
      
      const data = await response.json();
      setQuestions(data.questions);
      setSkills(data.skills);
      setQuestionSetId(data.question_set_id);
      setCurrentQuestionIndex(0);
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
      setQuestions([]);
      setSkills([]);
      setAnsweredQuestions({});
      
      try {
        // Use public endpoint for voice processing
        const response = await fetch('https://generator-1-backend.onrender.com/api/process-voice-public', {
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
        setQuestionSetId(data.question_set_id);
        setCurrentQuestionIndex(0);
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
      
      // Handle long skills text with wrapping
      const textLines = doc.splitTextToSize(skillsText, 180);
      doc.text(textLines, 15, 45);
    }
    
    // Add questions
    doc.setFontSize(12);
    doc.text('Questions:', 15, 65);
    
    let currentY = 75;
    questions.forEach((question, index) => {
      doc.setFontSize(10);
      
      // Handle long questions with wrapping
      const textLines = doc.splitTextToSize(`${index + 1}. ${question}`, 180);
      doc.text(textLines, 15, currentY);
      currentY += 10 * textLines.length;
      
      // Add some space between questions
      currentY += 5;
      
      // Add page if we're near the bottom
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
    });
    
    // Add answered questions and feedback if available
    if (Object.keys(answeredQuestions).length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Your Answers & Feedback', 105, 20, { align: 'center' });
      
      currentY = 35;
      Object.entries(answeredQuestions).forEach(([index, data]) => {
        const i = parseInt(index);
        
        doc.setFontSize(12);
        doc.text(`Question ${i + 1}:`, 15, currentY);
        currentY += 8;
        
        doc.setFontSize(10);
        const questionLines = doc.splitTextToSize(questions[i], 180);
        doc.text(questionLines, 15, currentY);
        currentY += 10 * questionLines.length;
        
        doc.setFontSize(12);
        doc.text('Your Answer:', 15, currentY);
        currentY += 8;
        
        doc.setFontSize(10);
        const answerLines = doc.splitTextToSize(data.answer, 180);
        doc.text(answerLines, 15, currentY);
        currentY += 10 * answerLines.length;
        
        if (data.feedback) {
          doc.setFontSize(12);
          doc.text('Feedback:', 15, currentY);
          currentY += 8;
          
          const feedbackLines = doc.splitTextToSize(data.feedback.feedback, 180);
          doc.text(feedbackLines, 15, currentY);
          currentY += 10 * feedbackLines.length + 5;
          
          doc.setFontSize(10);
          doc.text('Expected Answer:', 15, currentY);
          currentY += 8;
          
          const expectedLines = doc.splitTextToSize(data.feedback.expected_answer, 180);
          doc.text(expectedLines, 15, currentY);
          currentY += 10 * expectedLines.length + 10;
        }
        
        // Add page if needed
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
      });
    }
    
    // Save the PDF
    doc.save('interview-questions.pdf');
  };

  const toggleAnsweringMode = () => {
    setIsAnswering(!isAnswering);
    resetAnswerState();
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) {
      setError('Please provide an answer before submitting.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('https://generator-1-backend.onrender.com/api/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_set_id: questionSetId,
          question_index: currentQuestionIndex,
          answer: userAnswer
        }),
        credentials: 'include', // If using cookies for auth
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update to handle feedback instead of match_percentage
      setFeedback(data.feedback);
      setExpectedAnswer(data.expected_answer);
      setShowFeedback(true);
      
      // Store the answer and feedback
      setAnsweredQuestions(prev => ({
        ...prev,
        [currentQuestionIndex]: {
          answer: userAnswer,
          feedback: {
            feedback: data.feedback,
            expected_answer: data.expected_answer
          }
        }
      }));
    } catch (err) {
      setError('Failed to submit your answer. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      resetAnswerState();
    }
  };

  const moveToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      resetAnswerState();
    }
  };

  const resetAnswerState = () => {
    setUserAnswer('');
    setFeedback('');
    setExpectedAnswer('');
    setShowFeedback(false);
  };

  const getStateColor = (feedback) => {
    // Logic to determine color based on feedback
    if (!feedback) return 'text-blue-400';
    
    // You can implement your own logic here to determine colors
    // For example, check if feedback contains certain keywords
    if (feedback.toLowerCase().includes('excellent') || feedback.toLowerCase().includes('perfect')) 
      return 'text-green-400';
    if (feedback.toLowerCase().includes('good') || feedback.toLowerCase().includes('well')) 
      return 'text-yellow-400';
    return 'text-blue-400';
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
      
      {/* Only show file upload/recording when no questions generated yet or explicitly reset */}
      {questions.length === 0 && (
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
      )}

      {isLoading && (
        <div className="flex justify-center items-center gap-3 text-white bg-white/5 backdrop-blur-md rounded-xl p-6">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-lg">Analyzing your profile...</span>
        </div>
      )}

      {questions.length > 0 && !isLoading && (
        <div className="space-y-6 mb-12">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-white">
                Your Interview Questions
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleAnsweringMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
                  isAnswering ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isAnswering ? (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    View All Questions
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Practice Answering
                  </>
                )}
              </button>
              <button 
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
              >
                <Download className="w-5 h-5" />
                Export to PDF
              </button>
            </div>
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
          
          {isAnswering ? (
            // Practice answering mode
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={moveToPrevQuestion}
                    disabled={currentQuestionIndex === 0}
                    className={`p-2 rounded-lg ${
                      currentQuestionIndex === 0 
                        ? 'text-gray-500 cursor-not-allowed' 
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={moveToNextQuestion}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className={`p-2 rounded-lg ${
                      currentQuestionIndex === questions.length - 1
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 font-medium">{currentQuestionIndex + 1}</span>
                  </div>
                  <p className="text-lg text-white leading-relaxed">{questions[currentQuestionIndex]}</p>
                </div>
                
                {/* Check if this question already has an answer */}
                {answeredQuestions[currentQuestionIndex] ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/10 rounded-lg">
                      <p className="text-sm text-white/70 mb-2">Your answer:</p>
                      <p className="text-white">{answeredQuestions[currentQuestionIndex].answer}</p>
                    </div>
                    
                    {answeredQuestions[currentQuestionIndex].feedback && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg">
                          <Award className="w-6 h-6 text-blue-400" />
                          <div>
                            <p className="text-sm text-white/70">Feedback:</p>
                            <p className={`text-lg font-semibold ${
                              getStateColor(answeredQuestions[currentQuestionIndex].feedback.feedback)
                            }`}>
                              {answeredQuestions[currentQuestionIndex].feedback.feedback}
                            </p>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-white/10 rounded-lg">
                          <p className="text-sm text-white/70 mb-2">Expected Answer:</p>
                          <p className="text-white">{answeredQuestions[currentQuestionIndex].feedback.expected_answer}</p>
                        </div>
                        
                        <button
                          onClick={() => {
                            const updatedAnswers = {...answeredQuestions};
                            delete updatedAnswers[currentQuestionIndex];
                            setAnsweredQuestions(updatedAnswers);
                            resetAnswerState();
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-purple-300 transition-colors"
                        >
                          <RefreshCw className="w-5 h-5" />
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full h-40 p-4 bg-white/10 backdrop-blur-md rounded-lg text-white border border-white/20 focus:border-blue-500 focus:outline-none resize-none"
                    />
                    
                    <button
                      onClick={submitAnswer}
                      disabled={isSubmitting || !userAnswer.trim()}
                      className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg text-white transition-colors ${
                        isSubmitting || !userAnswer.trim()
                          ? 'bg-blue-500/50 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Submit Answer
                        </>
                      )}
                    </button>
                    
                    {showFeedback && (
                      <div className="space-y-4 mt-6">
                        <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg">
                          <Award className="w-6 h-6 text-blue-400" />
                          <div>
                            <p className="text-sm text-white/70">Feedback:</p>
                            <p className={`text-lg font-semibold ${getStateColor(feedback)}`}>
                              {feedback}
                            </p>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-white/10 rounded-lg">
                          <p className="text-sm text-white/70 mb-2">Expected Answer:</p>
                          <p className="text-white">{expectedAnswer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-8 p-4 bg-blue-500/10 rounded-lg flex items-center gap-3 text-blue-400">
                <Clock className="w-5 h-5" />
                <p className="text-sm">
                  Pro tip: Take about 30-60 seconds to structure your thoughts before answering each question.
                </p>
              </div>
            </div>
          ) : (
            // Question list view
            <div className="grid gap-4">
              {questions.map((question, index) => (
                <div
                  key={index}
                  className={`group backdrop-blur-md rounded-xl p-6 transition-all duration-300 ${
                    answeredQuestions[index] 
                      ? 'bg-green-500/10 hover:bg-green-500/20' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      answeredQuestions[index] ? 'bg-green-500/20' : 'bg-blue-500/20'
                    }`}>
                      {answeredQuestions[index] ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <span className="text-blue-400 font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg text-white leading-relaxed">{question}</p>
                      
                      {answeredQuestions[index] && (
                        <div className="mt-4 flex items-center gap-3">
                          <span className="text-sm text-white/70">Your feedback:</span>
                          <span className={`font-semibold ${
                            getStateColor(answeredQuestions[index].feedback.feedback)
                          }`}>
                            {answeredQuestions[index].feedback.feedback}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        setCurrentQuestionIndex(index);
                        setIsAnswering(true);
                      }}
                      className={`px-4 py-2 rounded-lg text-white transition-colors ${
                        answeredQuestions[index]
                          ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300'
                          : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300'
                      }`}
                    >
                      {answeredQuestions[index] ? 'View Answer' : 'Answer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-8 flex items-center justify-center">
            <button
              onClick={() => {
                setQuestions([]);
                setSkills([]);
                setQuestionSetId('');
                setCurrentQuestionIndex(0);
                resetAnswerState();
                setIsAnswering(false);
                setAnsweredQuestions({});
              }}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionGenerator;
