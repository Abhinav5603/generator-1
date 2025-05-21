import React, { useState, useEffect } from 'react';
import { Clock, X, FileText, AlertCircle, Download, ChevronRight, ChevronDown } from 'lucide-react';

const HistoryModal = ({ showHistory, setShowHistory }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("https://backend-qlgj.onrender.com/api/question-history-public");
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Fetched history:", data);
      
      // Ensure data is an array before setting state
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching history:", err);
      setError("Failed to load your question history. Please try again later.");
      // Show empty history in case of error
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const exportToPDF = (entry, index) => {
    // Create content for export
    const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "No timestamp";
    const questions = Array.isArray(entry.questions) ? entry.questions.join('\n\n') : "No questions available";
    const skills = Array.isArray(entry.skills) ? entry.skills.join(', ') : "No skills identified";
    
    // Format content
    const content = `Interview Questions Export\n\nDate: ${timestamp}\n\nQuestions:\n${questions}\n\nSkills: ${skills}`;
    
    // Create a Blob with the content
    const blob = new Blob([content], { type: 'text/plain' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-questions-${index}.txt`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <>
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-gray-900 to-black border border-purple-500/30 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
            <div className="flex justify-between items-center p-6 border-b border-purple-500/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center">
                  <Clock size={20} className="text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Question History
                </h3>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 rounded-lg border border-red-500/30 flex items-center gap-3">
                  <AlertCircle size={20} className="text-red-400" />
                  <p className="text-red-100">{error}</p>
                </div>
              )}
              
              {isLoading ? (
                <div className="py-16 text-center">
                  <div className="inline-block w-16 h-16 border-4 border-t-purple-500 border-r-purple-500 border-b-blue-500 border-l-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-6 text-gray-400 text-lg">Loading your question history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800/50 flex items-center justify-center">
                    <Clock size={48} className="text-gray-500" />
                  </div>
                  <p className="text-gray-300 text-xl font-medium mb-2">No question history found</p>
                  <p className="text-gray-500">Generated interview questions will appear here.</p>
                </div>
              ) : (
                <ul className="space-y-8">
                  {history.map((entry, idx) => {
                    const isResume = entry.sourceType === 'resume';
                    const gradientClass = isResume 
                      ? "from-blue-600/20 to-blue-900/10" 
                      : "from-purple-600/20 to-purple-900/10";
                    const borderClass = isResume 
                      ? "border-blue-500/30" 
                      : "border-purple-500/30";
                    const isExpanded = expandedItems[idx] || false;
                    
                    return (
                      <li key={idx} className={`border ${borderClass} bg-gradient-to-br ${gradientClass} rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-blue-500/10`}>
                        {/* Header with date and time only and chevron button */}
                        <div 
                          className={`flex justify-between items-center p-5 border-b ${borderClass} cursor-pointer`}
                          onClick={() => toggleExpand(idx)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-600/30 flex items-center justify-center">
                              <Clock size={18} className="text-blue-400" />
                            </div>
                            <div>
                              <div className="text-base text-gray-300">
                                {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "No timestamp"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown size={20} className="text-blue-400" />
                            ) : (
                              <ChevronRight size={20} className="text-blue-400" />
                            )}
                          </div>
                        </div>
                        
                        {/* Content - shown only when expanded */}
                        {isExpanded && (
                          <>
                            {/* Source content - for resume only */}
                            {isResume && (
                              <div className="px-5 py-4 bg-black/30 border-b border-gray-700">
                                <div className="flex flex-col gap-2">
                                  <span className="text-sm font-medium text-gray-300">Resume Details:</span>
                                  <p className="text-sm text-gray-400">{entry.resumeDetails || entry.resumeName || "No resume details available"}</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Questions */}
                            <div className="p-5">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-5 w-1.5 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                                <h4 className="font-medium text-white">Generated Questions</h4>
                              </div>
                              <ul className="space-y-3 ml-2">
                                {Array.isArray(entry.questions) ? 
                                  entry.questions.map((q, i) => (
                                    <li key={i} className="flex items-start gap-3 py-1">
                                      <div className={`flex-shrink-0 w-6 h-6 rounded-full ${
                                        isResume ? 'bg-blue-500/20' : 'bg-purple-500/20'
                                      } flex items-center justify-center mt-0.5`}>
                                        <span className={`text-xs font-medium ${
                                          isResume ? 'text-blue-400' : 'text-purple-400'
                                        }`}>{i+1}</span>
                                      </div>
                                      <p className="text-gray-300">{q}</p>
                                    </li>
                                  )) : 
                                  <li className="text-gray-500 italic">No questions available</li>
                                }
                              </ul>
                            </div>
                            
                            {/* Skills if available */}
                            {Array.isArray(entry.skills) && entry.skills.length > 0 && (
                              <div className="px-5 pb-5">
                                <div className="text-sm text-gray-300 mb-3">Identified Skills:</div>
                                <div className="flex flex-wrap gap-2">
                                  {entry.skills.map((skill, idx) => (
                                    <span key={idx} className={`px-3 py-1.5 text-sm rounded-full ${
                                      isResume 
                                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' 
                                        : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                                    }`}>
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Actions */}
                            <div className="px-5 py-4 border-t border-gray-700/50 flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the parent's onClick
                                  exportToPDF(entry, idx);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                                  isResume 
                                    ? 'bg-blue-600 hover:bg-blue-700' 
                                    : 'bg-purple-600 hover:bg-purple-700'
                                } text-white transition-colors`}
                              >
                                <Download size={16} />
                                Export Questions
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            
            <div className="p-6 border-t border-purple-500/30 flex justify-center">
              <button
                onClick={() => setShowHistory(false)}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HistoryModal;
