"use client";

import { useState, useRef, useEffect } from "react";

import { FiPaperclip } from "react-icons/fi";
import { IoSend } from "react-icons/io5";
import { MdImage, MdPictureAsPdf, MdDescription, MdClose } from "react-icons/md";
import { FaChevronUp, FaChevronDown, FaMicrophone } from "react-icons/fa";

export default function UserInput({ onMessageSent, messages = [] }) {
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("GPT-4.1");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [attachDropdownOpen, setAttachDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  
  const dropRef = useRef(null);

  const models = ["GPT-4.1", "GPT-4 Turbo", "GPT-3.5", "Claude 3", "Gemini Pro","DeepSeek-V3", "DeepSeek-R1", "DeepSeek-R1-0528"];

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedFile) return;

    const userMsg = { 
      role: "user", 
      content: trimmedMessage,
      timestamp: Date.now()
    };
    
    const conversationHistory = [...messages, userMsg];
    
    // Clear input immediately for better UX
    setMessage("");
    setSelectedFile(null);
    
    // Show user message immediately
    onMessageSent([userMsg], false);
    
    // Show thinking state
    onMessageSent([], true);
    
    try {
      const isHuggingFace = selectedModel === "DeepSeek-R1-0528";
      const apiEndpoint = isHuggingFace 
        ? "/api/huggingface" 
        : "/api/openrouter";

      if (selectedModel === "DeepSeek-V3") {
        // Handle DeepSeek-V3 API call
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            messages: conversationHistory,
            model: selectedModel
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from DeepSeek-V3 AI');
        }

        const data = await response.json();
        const assistantMsg = { 
          role: "assistant", 
          content: data.reply || data.message || "Received an empty response from DeepSeek-V3 AI.",
          timestamp: Date.now()
        };
        
        onMessageSent([assistantMsg], false);
      } else if (isHuggingFace) {
        // Handle streaming for HuggingFace
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: conversationHistory }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from DeepSeek-R1 AI');
        }

        // Create a streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMsg = {
          role: "assistant",
          content: "",
          timestamp: Date.now()
        };

        // Process the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.replace(/^data: /, '');
              if (data === '[DONE]') {
                onMessageSent([assistantMsg], false);
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.reply) {
                  assistantMsg.content += parsed.reply;
                  onMessageSent([{ ...assistantMsg }], true);
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        }
      } else {
        // Original non-streaming logic for other models
        const res = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: conversationHistory }),
        });
    
        if (!res.ok) {
          throw new Error('Failed to get response from AI');
        }
        
        const data = await res.json();
        const assistantMsg = { 
          role: "assistant", 
          content: data.reply,
          timestamp: Date.now()
        };
        
        onMessageSent([assistantMsg], false);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      onMessageSent([{ 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now()
      }], false);
    }
  };
  

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile({ name: file.name, type });
      setAttachDropdownOpen(false);
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
        <div className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded bg-opacity-30">
          📎 {selectedFile.name}
          <button
            onClick={() => setSelectedFile(null)}
            className="text-gray-600 hover:text-red-500"
          >
            <MdClose size={14} />
          </button>
        </div>
      )}

      {/* Message Input */}
      <input
        ref={inputRef}
        type="text"
        className="w-full mb-1 text-sm px-2 py-2 outline-none bg-transparent dark:text-white rounded-md"
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
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
          <button className="text-gray-600 dark:text-white hover:text-black dark:hover:text-gray-300">
            <FaMicrophone size={18} />
          </button>

          {/* Send Button */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              handleSend();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="focus:outline-none active:opacity-70 p-2 -mr-2"
            aria-label="Send message"
          >
            <IoSend size={18} className="text-gray-700 dark:text-white hover:text-black dark:hover:text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
