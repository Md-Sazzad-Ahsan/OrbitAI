"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import { FiPaperclip } from "react-icons/fi";
import { IoSend } from "react-icons/io5";
import { MdImage, MdPictureAsPdf, MdDescription, MdClose, MdMic, MdStop } from "react-icons/md";
import { FaChevronUp, FaChevronDown } from "react-icons/fa";
import { LuAudioLines } from "react-icons/lu";
import dynamic from 'next/dynamic';
import DescribeImg from './DescribeImg';

export default function UserInput({ onMessageSent, messages = [], personalization }) {
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("GPT-4.1");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [attachDropdownOpen, setAttachDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageDescription, setImageDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const recognitionRef = useRef(null);
  const lastTranscriptRef = useRef('');
  const timeoutRef = useRef(null);
  const lastSpokenTextRef = useRef('');
  const dropRef = useRef(null);
  const stopRecordingRef = useRef(() => {});
  const startRecordingRef = useRef(() => {});
  const abortControllerRef = useRef(null);

  const [models, setModels] = useState(["GPT-4.1","Gemma 3","DeepSeek-V3", "DeepSeek-R1", "DS-R1-0528"]);
  const [localModels, setLocalModels] = useState([]);
  const [useLocalModel, setUseLocalModel] = useState(false);
  
  // Check for local models and settings on component mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('ollamaSettings');
      if (savedSettings) {
        const { useLocalModels, selectedModel } = JSON.parse(savedSettings);
        if (useLocalModels) {
          setUseLocalModel(true);
          // Add 'My Models' to the beginning of the models list if not already present
          setModels(prev => 
            prev.includes('My Models') ? prev : ['My Models', ...prev]
          );
          // If 'My Models' is selected in settings, set it as the selected model
          if (selectedModel) {
            setSelectedModel('My Models');
          }
        }
      }
    } catch (error) {
      console.error('Error loading Ollama settings:', error);
    }
  }, []);

  // Reset textarea height when message is cleared
  useEffect(() => {
    if (!message && inputRef.current) {
      inputRef.current.style.height = '40px';
    }
  }, [message]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedFile) return;

    // Determine if we're using local models
    let modelToUse = selectedModel;
    let isUsingLocalModel = selectedModel === 'My Models';
    
    // If 'My Models' is selected, get the actual model from localStorage
    if (isUsingLocalModel) {
      try {
        const savedSettings = localStorage.getItem('ollamaSettings');
        if (savedSettings) {
          const { selectedModel: savedModel } = JSON.parse(savedSettings);
          if (savedModel) {
            modelToUse = savedModel;
          } else {
            // Fallback to first model if none selected
            modelToUse = models[0] || 'llama2';
          }
        }
      } catch (error) {
        console.error('Error loading model from settings:', error);
        modelToUse = models[0] || 'llama2';
      }
    }

    // Prepare the message content
    let messageContent = trimmedMessage;
    
    // If there's an image and description, include them in the API call
    const apiBody = { messages: [] };
    
    if (selectedFile?.type === 'image' && imageDescription) {
      // For the API call, include the image description
      apiBody.messages.push({
        role: "user",
        content: [
          { type: "text", text: trimmedMessage },
          { type: "text", text: `Image description: ${imageDescription}` }
        ]
      });
    } else {
      // Regular text message for the API
      apiBody.messages.push({
        role: "user",
        content: trimmedMessage
      });
    }

    // For the UI, just show the message and image name
    const userMsg = {
      role: "user",
      content: selectedFile && selectedFile.type === 'image' 
        ? `${trimmedMessage} [Image: ${selectedFile.name}]` 
        : trimmedMessage,
      timestamp: Date.now(),
    };

    const conversationHistory = [...messages, userMsg];

    // Update UI immediately
    setMessage("");
    setSelectedFile(null);
    onMessageSent([userMsg], false); // Add user message to conversation

    // Prepare for assistant's response
    const assistantMsg = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    onMessageSent([assistantMsg], true); // Show 'thinking' state
    
    // Set up abort controller for the request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    setIsStreaming(true);

    try {
      let apiEndpoint;
      const modelEndpoints = {
        'GPT-4.1': '/api/nvdia-gemma',
        'Gemma 3': '/api/openrouter/gemma',
        'DeepSeek-V3': '/api/nvdia',
        'DeepSeek-R1': '/api/huggingface',
        'DS-R1-0528': '/api/openrouter'
      };

      if (isUsingLocalModel) {
        // For local models, use the Ollama endpoint and include the model name
        apiEndpoint = '/api/ollama';
        apiBody.model = modelToUse; // Add the model to the request body
      } else {
        // For other models, use the appropriate endpoint
        apiEndpoint = modelEndpoints[selectedModel] || '/api/openrouter';
      }

      // Prepare the request body
      const requestBody = apiBody;
      
      // Add conversation history and personalization if not already set by image handling
      if (!requestBody.messages || requestBody.messages.length === 0) {
        requestBody.messages = conversationHistory;
      }
      
      // Add personalization data if available
      if (personalization) {
        requestBody.personalization = personalization;
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onMessageSent([{ ...assistantMsg }], false); // Final update, turn off thinking
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim().startsWith("data:")) continue;

          const jsonStr = line.replace("data:", "").trim();
          if (jsonStr === "[DONE]") {
            onMessageSent([{ ...assistantMsg }], false); // Turn off thinking
            return; // Exit loop
          }

          try {
            const parsed = JSON.parse(jsonStr);
            // Universal content extraction from different API responses
            const content = parsed.reply || parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              assistantMsg.content += content;
              // Update the UI in real-time
              onMessageSent([{ ...assistantMsg }], true);
            }
          } catch (e) {
            // This can happen if the JSON is incomplete; buffer will handle it
            console.error("Error parsing streaming JSON chunk:", e, "Chunk:", jsonStr);
          }
        }
      }
    } catch (error) {
      // Don't show error if the request was aborted
      if (error.name !== 'AbortError') {
        console.error('Failed to get AI response:', error);
        onMessageSent([
          {
            role: "assistant",
            content: `Sorry, an error occurred: ${error.message}`,
            timestamp: Date.now(),
          },
        ], false);
      }
    } finally {
      setIsStreaming(false);
    }
  };
  

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile({ name: file.name, type });
      setAttachDropdownOpen(false);
      
      if (type === 'image') {
        // Switch to Gemma 3 for images
        setSelectedModel('Gemma 3');
        // Show popup message
        alert('Gemma only for Image');
        // Set the file name in the input
        setMessage(prev => prev ? `${prev} ${file.name}` : file.name);
        setImageFile(file);
      }
      
      // Reset the file input to allow selecting the same file again
      e.target.value = null;
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile({ name: file.name, type: file.type });
    }
  };

  // Handle Enter key press to send message
  const inputRef = useRef(null);
  
  useEffect(() => {
    // Check for existing microphone permission
    const savedPermission = localStorage.getItem('hasMicrophoneAccess');
    if (savedPermission === 'true') {
      setHasMicPermission(true);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };
    
    const input = inputRef.current;
    if (input) {
      input.addEventListener('keydown', handleKeyDown);
      return () => {
        input.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [message, selectedFile]);

  // Initialize the recording functions with useRef to avoid circular dependencies
  useEffect(() => {
    stopRecordingRef.current = (shouldSend = false) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (e) {
          console.warn('Error stopping recognition:', e);
        } finally {
          if (shouldSend && lastSpokenTextRef.current) {
            handleSend();
            lastSpokenTextRef.current = '';
          }
          setIsRecording(false);
        }
      }
    };

    startRecordingRef.current = async () => {
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
          
          // Update the message with the current transcript
          if (finalTranscript) {
            // For final results, add to the message
            const newText = finalTranscript.trim();
            setMessage(prev => {
              const base = prev.endsWith(interimTranscript) 
                ? prev.slice(0, -interimTranscript.length).trim() 
                : prev;
              return (base ? base + ' ' : '') + newText;
            });
            lastSpokenTextRef.current = newText;
          } else if (interimTranscript) {
            // For interim results, replace the last interim result
            setMessage(prev => {
              // Find the last interim result in the current message
              const lastSpace = prev.lastIndexOf(' ');
              const lastWord = lastSpace === -1 ? prev : prev.slice(lastSpace + 1);
              
              // If the last word is likely part of the current interim result, replace it
              if (lastWord && interimTranscript.toLowerCase().includes(lastWord.toLowerCase())) {
                return prev.slice(0, lastSpace + 1) + interimTranscript;
              }
              // Otherwise append the new interim result
              return prev + (prev && !prev.endsWith(' ') ? ' ' : '') + interimTranscript;
            });
          }
          
          // Auto-send after 2.5 seconds of silence
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          timeoutRef.current = setTimeout(() => {
            if (lastSpokenTextRef.current) {
              stopRecordingRef.current(true);
            }
          }, 2500);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          stopRecordingRef.current();
        };
        
        recognitionRef.current.start();
        setIsRecording(true);
        
      } catch (err) {
        console.error('Error starting recording:', err);
        setHasMicPermission(false);
      }
    };
  }, [handleSend]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // If we're stopping recording, send any pending text
      stopRecordingRef.current(true);
      return;
    }

    // Clear any previous state
    lastSpokenTextRef.current = '';
    
    // Check if we already have permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks to release the microphone immediately
      stream.getTracks().forEach(track => track.stop());
      
      setHasMicPermission(true);
      await startRecordingRef.current();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setHasMicPermission(false);
    }
  }, [isRecording]);

  const handleVoiceMessage = (message) => {
    if (message.trim()) {
      setMessage(prev => prev ? `${prev} ${message}` : message);
      // Focus the input field after setting the message
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  return (
    <div
      ref={dropRef}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      className={`border rounded-xl p-3 shadow-sm w-full max-w-4xl mx-auto bg-white dark:bg-gray-900 dark:border-gray-700 ${
        dragOver ? "border-gray-500 bg-gray-50 dark:bg-gray-900" : ""
      }`}
    >
      {/* File Preview */}
      {selectedFile && (
        <div className="mb-2">
          <div className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded bg-opacity-30">
            📎 {selectedFile.name}
            <button
              onClick={() => {
                setSelectedFile(null);
                setImageFile(null);
                setImageDescription('');
              }}
              className="text-gray-600 hover:text-red-500"
            >
              <MdClose size={14} />
            </button>
          </div>
          {selectedFile.type === 'image' && imageFile && (
            <div className="mt-2">
              <DescribeImg 
                file={imageFile}
                onDescriptionReady={(desc) => setImageDescription(desc)}
                onError={(error) => console.error('Image processing error:', error)}
              />
            </div>
          )}
        </div>
      )}

      {/* Message Input */}
      <textarea
        ref={inputRef}
        className="w-full mb-1 text-sm px-2 py-2 outline-none bg-transparent dark:text-white rounded-md resize-none ultra-thin-scrollbar"
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows="1"
        style={{
          minHeight: '40px',
          maxHeight: '150px',
          overflowY: 'auto'
        }}
        onInput={(e) => {
          // Auto-resize the textarea based on content
          e.target.style.height = 'auto';
          e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
        }}
        onKeyDown={(e) => {
          // Handle Enter key press without shift
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />

      {/* Bottom Row */}
      <div className="flex justify-between items-center pt-2 text-sm flex-wrap gap-2">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
          {/* Attach Dropdown */}
          <div className="relative text-xs">
            <button
              onClick={() => {
                setAttachDropdownOpen(!attachDropdownOpen);
                setModelDropdownOpen(false);
              }}
              className="flex items-center gap-1 cursor-pointer px-2 py-1 border rounded bg-white dark:bg-gray-900 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiPaperclip />
              <span>Attach</span>
              {attachDropdownOpen ? <FaChevronDown size={10} /> : <FaChevronUp size={10} />}
            </button>

            {attachDropdownOpen && (
              <div className="absolute bottom-full mb-1 left-0 w-32 bg-white dark:bg-gray-900 border dark:border-gray-600 rounded shadow-md z-10">
                <label className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                  <MdPictureAsPdf />
                  <span>PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "pdf")}
                  />
                </label>
                <label className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                  <MdDescription />
                  <span>Doc</span>
                  <input
                    type="file"
                    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "doc")}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Image Upload */}
          <label className="flex items-center gap-1 cursor-pointer border border-gray-200 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs">
            <MdImage />
            <span>Image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "image")}
            />
          </label>
          
          {/* Model Dropdown */}
          <div className="relative text-xs">
            <button
              onClick={() => {
                setModelDropdownOpen(!modelDropdownOpen);
                setAttachDropdownOpen(false);
              }}
              className="flex items-center justify-between gap-2 border rounded px-2 py-1 bg-white dark:bg-gray-900 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {selectedModel}
              {modelDropdownOpen ? <FaChevronDown size={10} /> : <FaChevronUp size={10} />}
            </button>

            {modelDropdownOpen && (
              <div className="absolute bottom-full mb-1 left-0 w-36 bg-white dark:bg-gray-900 border dark:border-gray-600 rounded shadow-md z-10">
                {models.map((model) => (
                  <div
                    key={model}
                    onClick={() => {
                      setSelectedModel(model);
                      setModelDropdownOpen(false);
                    }}
                    className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    {model}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 ml-auto relative">

          {/* Audio Button */}
          <button 
            onClick={toggleRecording}
            className={`p-1.5 rounded-full ${isRecording ? 'text-gray-500 bg-gray-400 dark:bg-gray-700' : hasMicPermission ? 'text-gray-50 hover:bg-blue-100 dark:hover:bg-gray-500' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            aria-label={isRecording ? 'Stop recording' : hasMicPermission ? 'Start recording' : 'Request microphone access'}
          >
            {isRecording ? <MdStop size={20} /> : hasMicPermission ? <LuAudioLines size={20} /> : <LuAudioLines size={20} />}
          </button>

          {/* Send/Stop Button */}
          {isStreaming ? (
            <button 
              onClick={(e) => {
                e.preventDefault();
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                  abortControllerRef.current = null;
                  setIsStreaming(false);
                  // Notify parent that streaming has been stopped
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage?.role === 'assistant') {
                    onMessageSent([{ ...lastMessage }], false);
                  }
                }
              }}
              className="focus:outline-none active:opacity-70 border rounded-full p-1 -mr-2 text-gray-500 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400"
              aria-label="Stop generating"
            >
              <MdStop size={24} />
            </button>
          ) : (
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleSend();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full active:opacity-70 p-2 -mr-2"
              aria-label="Send message"
              disabled={isStreaming}
            >
              <IoSend size={20} className="text-gray-700 dark:text-white hover:text-black dark:hover:text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute -top-8 left-0 right-0 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Listening...
          </span>
        </div>
      )}
    </div>
  );
}
