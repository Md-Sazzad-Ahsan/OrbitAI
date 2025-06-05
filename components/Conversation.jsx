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
          <div className="space-y-2 py-2">
            {/* Show all displayed messages */}
            {displayedMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[95%] rounded-lg py-2 text-md
                    break-words overflow-x-auto
                    ${msg.role === 'user'
                      ? 'bg-gray-400 dark:bg-gray-600 text-white rounded-tr-none'
                      : 'text-gray-900 dark:text-gray-100 rounded-tl-none'}
                  `}
                  style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="break-words" {...props} />,
                      code: ({node, ...props}) => (
                        <code className="break-words whitespace-pre-wrap" {...props} />
                      )
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            
            {/* Show thinking message while waiting for response */}
            {isThinking && !isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[95%] rounded-lg p-2 text-md text-gray-500 dark:text-gray-400 italic rounded-tl-none break-words">
                  Thinking...
                </div>
              </div>
            )}
            
            {/* Show streaming message once content starts */}
            {!isParentStreaming && isStreaming && streamingContent !== '' && (
              <div className="flex justify-start">
                <div className="max-w-[95%] rounded-lg py-2 text-md text-gray-900 dark:text-gray-100 rounded-tl-none">
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
