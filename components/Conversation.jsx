'use client';

import { useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// This component renders the conversation history. It is designed to work with
// a parent component that handles real-time streaming. The `messages` prop
// is expected to be updated incrementally, with the last message growing as
// new data chunks arrive.

export default function Conversation({ messages = [], isThinking = false }) {
  const endRef = useRef(null);

  // Callback to scroll to the bottom of the conversation view
  const scrollToBottom = useCallback(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  // Automatically scroll down when messages are updated
  useEffect(() => {
    // A small delay ensures the DOM is fully updated before scrolling
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  // Perform an initial scroll when the component mounts
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    <div className="w-full bg-transparent">
      <div className="max-w-3xl mx-auto">
        {messages.length === 0 && !isThinking ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4 mt-40">
            Start a conversation with OrbitAI
          </div>
        ) : (
          <div className="space-y-2 py-1">
            {/* Render all messages directly from props */}
            {messages.map((msg, idx) => (
              // Basic validation to prevent rendering malformed messages
              msg && msg.role && (msg.content || msg.role !== 'assistant') && (
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
                          p: ({ node, ...props }) => <p className="break-words my-2 leading-relaxed" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold my-3" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-xl font-semibold my-3" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-lg font-medium my-2" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-2 space-y-1" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-2 space-y-1" {...props} />,
                          li: ({ node, ...props }) => <li className="my-1 leading-relaxed" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-3" {...props} />,
                          code: ({ node, inline, ...props }) => (
                            <code
                              className={`${inline ? 'bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded' : 'block bg-gray-100 dark:bg-gray-800 p-3 rounded my-2 overflow-x-auto'} text-sm font-mono`}
                              {...props}
                            />
                          ),
                          pre: ({ node, ...props }) => <pre className="whitespace-pre-wrap break-words my-3" {...props} />,
                          a: ({ node, ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:underline break-words" target="_blank" rel="noopener noreferrer" {...props} />,
                          table: ({ node, ...props }) => <table className="min-w-full border-collapse my-3" {...props} />,
                          th: ({ node, ...props }) => <th className="border px-4 py-2 text-left bg-gray-100 dark:bg-gray-700" {...props} />,
                          td: ({ node, ...props }) => <td className="border px-4 py-2" {...props} />,
                          hr: ({ node, ...props }) => <hr className="my-4 border-gray-300 dark:border-gray-600" {...props} />,
                        }}
                      >
                        {/* Content is rendered directly and will update as the stream arrives */}
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )
            ))}

            {/* Show a thinking indicator while waiting for the first response chunk */}
            {isThinking && (
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
          </div>
        )}
        <div ref={endRef} className="h-4" />
      </div>
    </div>
  );
}
