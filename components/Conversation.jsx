'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Conversation({ messages = [], isThinking = false, isStreaming: isParentStreaming = false }) {
  const endRef = useRef(null);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const streamInterval = useRef(null);
  const messagesRef = useRef(messages);

  // Update messages ref when messages prop changes
  useEffect(() => {
    messagesRef.current = messages.filter(msg => msg && msg.role && msg.content);
  }, [messages]);

  // Handle scrolling to the bottom
  const scrollToBottom = useCallback(({ behavior = 'smooth' } = {}) => {
    if (endRef.current) {
      endRef.current.scrollIntoView({
        behavior,
        block: 'end',
        inline: 'nearest'
      });
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamInterval.current) {
        clearInterval(streamInterval.current);
      }
      prevStreamingContent.current = '';
    };
  }, []);

  // Track initial render to prevent streaming of loaded messages
  const initialRender = useRef(true);
  const lastMessageId = useRef(null);
  
  // Handle messages and streaming effect
  useEffect(() => {
    const validMessages = messagesRef.current;
    if (validMessages.length === 0) {
      setDisplayedMessages([]);
      return;
    }

    // On initial render, just set the messages directly
    if (initialRender.current) {
      setDisplayedMessages(validMessages);
      initialRender.current = false;
      lastMessageId.current = validMessages.length > 0 ? 
        validMessages[validMessages.length - 1].timestamp : null;
      return;
    }

    // Get the last message
    const lastMessage = validMessages[validMessages.length - 1];
    
    // Check if this is a new message
    const isNewMessage = !lastMessageId.current || 
                        (lastMessage.timestamp && lastMessage.timestamp !== lastMessageId.current);
    
    // Handle new assistant messages
    if (lastMessage.role === 'assistant' && isNewMessage) {
      // Update the last message ID
      lastMessageId.current = lastMessage.timestamp;
      
      // Start streaming for new assistant messages
      setIsStreaming(true);
      setStreamingContent('');
      
      // Clear any existing interval
      if (streamInterval.current) {
        clearInterval(streamInterval.current);
      }
      
      // Start streaming the last message with optimized performance
      const content = lastMessage.content || '';
      const chunkSize = Math.max(1, Math.floor(content.length / 50)); // Dynamic chunk size
      let currentPos = 0;
      
      const streamChunk = () => {
        if (currentPos < content.length) {
          // Process next chunk
          currentPos = Math.min(currentPos + chunkSize, content.length);
          setStreamingContent(content.substring(0, currentPos));
          
          // Schedule next chunk with dynamic delay
          const remaining = content.length - currentPos;
          const speedFactor = Math.max(0.5, Math.min(1, remaining / 100)); // Faster at the end
          const delay = Math.max(1, 10 * speedFactor); // 1-10ms delay
          
          streamInterval.current = setTimeout(streamChunk, delay);
        } else {
          clearTimeout(streamInterval.current);
          setIsStreaming(false);
          setDisplayedMessages(validMessages);
        }
      };
      
      // Start streaming
      streamChunk();
      
      return () => {
        if (streamInterval.current) {
          clearInterval(streamInterval.current);
        }
      };
    } else {
      // For all other cases, just update the messages
      setDisplayedMessages(validMessages);
    }
  }, [messages]); // Removed displayedMessages from dependencies

  // Scroll to bottom when messages change or streaming state changes
  useEffect(() => {
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      scrollToBottom({ behavior: 'smooth' });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages, isStreaming, streamingContent, scrollToBottom]);
  
  // Handle initial scroll when component mounts
  useEffect(() => {
    scrollToBottom({ behavior: 'auto' });
  }, [scrollToBottom]);

  return (
    <div className="w-full bg-transparent">
      <div className="max-w-3xl mx-auto">
        {displayedMessages.length === 0 && !isStreaming ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4 mt-40">
            Start a conversation with OrbitAI
          </div>
        ) : (
          <div className="space-y-2 py-1">
            {/* Show all displayed messages */}
            {displayedMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[95%] rounded-lg py-1 px-2 text-md
                    break-words overflow-x-auto
                    ${msg.role === 'user'
                      ? 'bg-gray-400 dark:bg-gray-600 text-white rounded-tr-none'
                      : 'text-gray-900 dark:text-gray-100 rounded-tl-none'}
                  `}
                  style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                >
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="break-words my-2 leading-relaxed" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-3" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-semibold my-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-medium my-2" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-6 my-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="my-1 leading-relaxed" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-3" {...props} />,
                        code: ({node, inline, ...props}) => (
                          <code 
                            className={`${inline ? 'bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded' : 'block bg-gray-100 dark:bg-gray-800 p-3 rounded my-2 overflow-x-auto'} text-sm font-mono`}
                            {...props} 
                          />
                        ),
                        pre: ({node, ...props}) => <pre className="whitespace-pre-wrap break-words my-3" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-600 dark:text-blue-400 hover:underline break-words" target="_blank" rel="noopener noreferrer" {...props} />,
                        table: ({node, ...props}) => <table className="min-w-full border-collapse my-3" {...props} />,
                        th: ({node, ...props}) => <th className="border px-4 py-2 text-left bg-gray-100 dark:bg-gray-700" {...props} />,
                        td: ({node, ...props}) => <td className="border px-4 py-2" {...props} />,
                        hr: ({node, ...props}) => <hr className="my-4 border-gray-300 dark:border-gray-600" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Show thinking message while waiting for response */}
            {isThinking && !isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[95%] rounded-lg p-1 text-md text-gray-500 dark:text-gray-400 italic rounded-tl-none break-words flex items-center gap-2">
                  <svg className="animate-spin size-3 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div className="flex items-center gap-2">
                    <span>Thinking</span>
                    <div className="flex items-center gap-1">
                      <span className="animate-bounce [animation-delay:-0.3s] [animation-duration:1.5s]">.</span>
                      <span className="animate-bounce [animation-delay:-0.15s] [animation-duration:1.5s]">.</span>
                      <span className="animate-bounce [animation-duration:1.5s]">.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Show streaming message once content starts */}
            {!isParentStreaming && isStreaming && streamingContent !== '' && (
              <div className="flex justify-start">
                <div className="max-w-[95%] rounded-lg py-1 px-2 text-md text-gray-900 dark:text-gray-100 rounded-tl-none">
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="break-words" {...props} />,
                        code: ({node, ...props}) => (
                          <code className="break-words whitespace-pre-wrap" {...props} />
                        )
                      }}
                    >
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={endRef} className="h-4" />
      </div>
    </div>
  );
}
