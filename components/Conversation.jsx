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
  const scrollToBottom = useCallback(({ behavior = 'auto' } = {}) => {
    endRef.current?.scrollIntoView({ behavior });
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
      
      // Start streaming the last message
      let currentChar = 0;
      const content = lastMessage.content || '';
      
      streamInterval.current = setInterval(() => {
        if (currentChar < content.length) {
          setStreamingContent(content.substring(0, currentChar + 1));
          currentChar++;
        } else {
          clearInterval(streamInterval.current);
          setIsStreaming(false);
          setDisplayedMessages(validMessages);
        }
      }, 10); // Slightly faster for better UX
      
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

  // Scroll when messages change or when streaming starts/stops
  const prevIsStreaming = useRef(isStreaming);
  useEffect(() => {
    // Only scroll if we're not currently streaming or if we just stopped streaming
    if (!isStreaming) {
      if (prevIsStreaming.current !== isStreaming) {
        // Just stopped streaming, do a smooth scroll
        scrollToBottom({ behavior: 'smooth' });
      } else {
        // For other message updates, do an instant scroll
        scrollToBottom({ behavior: 'auto' });
      }
    }
    prevIsStreaming.current = isStreaming;
  }, [displayedMessages, isStreaming, scrollToBottom]);
  
  // Handle scrolling during streaming
  const prevStreamingContent = useRef('');
  const scrollTimer = useRef(null);
  
  useEffect(() => {
    if (isStreaming && streamingContent.length > prevStreamingContent.current.length) {
      // Only update the previous content ref, don't scroll during streaming
      prevStreamingContent.current = streamingContent;
    }
    
    // Clean up any pending scrolls on unmount
    return () => {
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
    };
  }, [streamingContent, isStreaming]);
  
  // Scroll to bottom when streaming starts or stops
  useEffect(() => {
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
    }
    
    scrollTimer.current = setTimeout(() => {
      scrollToBottom({ behavior: isStreaming ? 'auto' : 'smooth' });
    }, 50);
    
    return () => {
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
    };
  }, [isStreaming, scrollToBottom]);

  return (
    <div className="w-full bg-transparent">
      <div className="max-w-3xl mx-auto">
        {displayedMessages.length === 0 && !isStreaming ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4 mt-40">
            Start a conversation with OrbitAI
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {/* Show all displayed messages */}
            {displayedMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[85%] rounded-lg p-2 text-md whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-gray-400 dark:bg-gray-600 text-white rounded-tr-none'
                      : 'text-gray-900 dark:text-gray-100 rounded-tl-none'}
                  `}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            
            {/* Show thinking message while waiting for response */}
            {isThinking && !isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg p-2 text-md whitespace-pre-wrap text-gray-500 dark:text-gray-400 italic rounded-tl-none">
                  Thinking...
                </div>
              </div>
            )}
            
            {/* Show streaming message once content starts */}
            {!isParentStreaming && isStreaming && streamingContent !== '' && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg p-2 text-md whitespace-pre-wrap text-gray-900 dark:text-gray-100 rounded-tl-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingContent}
                  </ReactMarkdown>
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
