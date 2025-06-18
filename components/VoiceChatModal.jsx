'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { FaMicrophone, FaStop, FaTimes } from 'react-icons/fa';

export default function VoiceChatModal({ isOpen, onClose, onSendMessage }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const lastTranscriptRef = useRef('');
  const timeoutRef = useRef(null);
  const lastSpokenTextRef = useRef('');
  
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        // Remove the onend handler to prevent restarting
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      } finally {
        setIsRecording(false);
      }
    }
  }, []);

  useEffect(() => {
    // Check if speech recognition is available
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition is not supported in this browser');
      return;
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Only update with final results to avoid UI flickering
        if (finalTranscript) {
          setTranscribedText(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        // Handle different error types
        if (event.error === 'network') {
          setError('Network error: Please check your internet connection and try again.');
        } else if (event.error === 'not-allowed') {
          setError('Microphone access was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'audio-capture') {
          setError('No microphone was found. Please ensure a microphone is connected.');
        } else {
          setError('Speech recognition error. Please try again or type your message instead.');
        }
        
        // Reset the recognition object to prevent further errors
        recognitionRef.current = null;
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          // If we're still supposed to be recording, restart the recognition
          try {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          } catch (e) {
            console.error('Error restarting speech recognition:', e);
            setIsRecording(false);
          }
        }
      };
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Toggle recording state - used for the stop button
  const toggleRecording = () => {
    if (!isSpeechRecognitionSupported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    
    if (isRecording) {
      stopRecording();
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscribedText(prev => prev + finalTranscript);
        }
      };

      if (isRecording) {
        // Stop recording
        try {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
        setIsRecording(false);
      } else {
        // Start recording
        setTranscribedText('');
        setError(null);
        
        // Check if online
        if (!navigator.onLine) {
          setError('You appear to be offline. Please check your internet connection.');
          return;
        }
        
        try {
          if (!recognitionRef.current) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
              recognitionRef.current = new SpeechRecognition();
              recognitionRef.current.continuous = true;
              recognitionRef.current.interimResults = true;
              
              recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                  if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                  }
                }
                if (finalTranscript) {
                  setTranscribedText(prev => prev + finalTranscript);
                }
              };
            }
          }
          if (recognitionRef.current) {
            recognitionRef.current.start();
            setIsRecording(true);
          } else {
            console.error('Speech recognition is not available');
            // Show a user-friendly message
            setTranscribedText('Speech recognition is not supported in this browser.');
          }
        } catch (e) {
          console.error('Error starting recognition:', e);
          setTranscribedText('Error accessing microphone. Please check your browser permissions.');
        }
      }
    } catch (e) {
      console.error('Error toggling recording:', e);
    }
  };

  // Auto-send transcribed text when there's a pause in speech
  useEffect(() => {
    if (transcribedText.trim() && transcribedText !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcribedText;
      lastSpokenTextRef.current = transcribedText.trim();
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a new timeout for 2.5 seconds
      timeoutRef.current = setTimeout(() => {
        if (lastSpokenTextRef.current) {
          onSendMessage(lastSpokenTextRef.current);
          lastSpokenTextRef.current = '';
        }
      }, 2500);
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [transcribedText, onSendMessage]);

  // This function is no longer needed since we're auto-sending
  // But keeping it for any potential future use
  const handleSend = () => {
    if (transcribedText.trim()) {
      onSendMessage(transcribedText.trim());
      // Don't close the modal or clear the text here
    }
  };

  // Clear transcribed text and start recording when modal is opened
  useEffect(() => {
    if (isOpen) {
      setTranscribedText('');
      lastTranscriptRef.current = '';
      
      // Start recording automatically when modal opens
      const startRecording = async () => {
        try {
          // Request microphone permission first
          await navigator.mediaDevices.getUserMedia({ audio: true });
          
          // Initialize speech recognition if not already done
          if (!recognitionRef.current) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
              recognitionRef.current = new SpeechRecognition();
              recognitionRef.current.continuous = true;
              recognitionRef.current.interimResults = true;
              
              recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                  if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                  }
                }
                if (finalTranscript) {
                  setTranscribedText(prev => prev + finalTranscript);
                }
              };
            }
          }
          
          // Start recognition
          if (recognitionRef.current) {
            recognitionRef.current.start();
            setIsRecording(true);
          }
        } catch (err) {
          console.error('Error starting recording:', err);
          setError('Could not access microphone. Please check your permissions.');
        }
      };
      
      startRecording();
    }
    
    // Clean up when component unmounts or modal is closed
    return () => {
      stopRecording();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Check if speech recognition is supported
  const isSpeechRecognitionSupported = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  
  // If not supported, show a message
  if (typeof window !== 'undefined' && !isSpeechRecognitionSupported) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden">
          <div className="p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <FaMicrophone className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Voice Input Not Supported
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your browser doesn't support speech recognition. Please use the latest version of Chrome, Edge, or Safari.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Voice Chat</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="min-h-48 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {error ? (
              <div className="text-center p-4">
                <div className="text-red-500 mb-2">
                  <FaTimes size={24} className="mx-auto" />
                </div>
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : transcribedText ? (
              <p className="text-gray-800 dark:text-gray-200">{transcribedText}</p>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  {isRecording 
                    ? (
                      <>
                        <span className="inline-block animate-pulse">🎤</span> Listening...
                      </>
                    ) 
                    : 'Click the microphone to start speaking'}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center">
            <button
              onClick={toggleRecording}
              className={`flex items-center justify-center w-12 h-12 rounded-full ${
                isRecording ? 'bg-red-500' : 'bg-blue-600'
              } text-white transition-colors`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              disabled={isRecording} // Disable the button while recording
            >
              <FaStop size={20} />
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {isRecording ? 'Click to stop' : 'Click to speak'}
            </p>
            
            <button
              onClick={() => {
                stopRecording();
                onClose();
              }}
              className="px-6 py-2 rounded-full font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
