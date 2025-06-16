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

  const models = ["GPT-4.1","DeepSeek-V3", "DeepSeek-R1", "DeepSeek-R1-0528"];

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedFile) return;

    const userMsg = {
      role: "user",
      content: trimmedMessage,
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

    try {
      let apiEndpoint;
      switch (selectedModel) {
        case 'GPT-4.1':
          apiEndpoint = '/api/nvdia-gemma';
          break;
        case 'DeepSeek-V3':
          apiEndpoint = '/api/nvdia';
          break;
        case 'DeepSeek-R1':
          apiEndpoint = '/api/huggingface';
          break;
        case 'DeepSeek-R1-0528':
          apiEndpoint = '/api/openrouter';
          break;
        default:
          apiEndpoint = '/api/openrouter';
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationHistory }),
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
      console.error('Failed to get AI response:', error);
      onMessageSent([
        {
          role: "assistant",
          content: `Sorry, an error occurred: ${error.message}`,
          timestamp: Date.now(),
        },
      ], false);
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
