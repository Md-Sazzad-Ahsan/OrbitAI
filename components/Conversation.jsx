'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import CopyButton from '@/components/CopyButton';
import UserInput from './UserInput';

// Helper function to extract thinking and main content
const extractThinkingContent = (content) => {
  const thinkMatch = content.match(/<think>([\s\S]*?)(<\/think>|$)([\s\S]*)/);
  if (!thinkMatch) return { hasThinking: false, thinkingContent: '', mainContent: content };
  
  const thinkingContent = thinkMatch[1] || '';
  const mainContent = thinkMatch[3] || '';
  
  return {
    hasThinking: true,
    thinkingContent: thinkingContent.trim(),
    mainContent: mainContent.trim(),
    isComplete: thinkMatch[2] === '</think>'
  };
};

// This component renders the conversation history. It is designed to work with
// a parent component that handles real-time streaming. The `messages` prop
// is expected to be updated incrementally, with the last message growing as
// new data chunks arrive.

export default function Conversation({ messages = [], isThinking = false, onMessageSent, personalization }) {
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
    <div className="relative h-[calc(100vh-4rem)] bg-transparent w-full">
      {/* Scrollable conversation area */}
      <div className="absolute inset-0 overflow-y-auto pb-24">
        <div className="max-w-3xl mx-auto w-full pt-4 pb-12 px-4">
          {messages.length === 0 && !isThinking ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4 mt-40">
              Start a conversation with OrbitAI
            </div>
          ) : (
            <div className="space-y-5 py-1">
              {messages.map((msg, idx) => (
                msg && msg.role && (msg.content || msg.role !== 'assistant') && (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                        max-w-[95%] rounded-lg py-1 text-md
                        break-words overflow-x-auto
                        ${msg.role === 'user'
                          ? 'bg-gray-400 dark:bg-gray-600 text-white rounded-tr-none px-2 md:mr-1'
                          : 'text-gray-900 dark:text-gray-100 rounded-tl-none'}
                      `}
                      style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                    >
                      <div className="markdown-content w-full [&_pre]:w-full [&_pre]:overflow-x-auto [&_pre]:bg-gray-100 dark:[&_pre]:bg-gray-800 [&_pre]:p-2 [&_pre]:rounded [&_pre]:my-2 [&_pre]:max-w-[calc(100vw-2rem)] md:[&_pre]:max-w-[calc(100vw-50%)] [&_pre_code]:whitespace-pre [&_pre_code]:block [&_pre_code]:w-fit">
                        {(() => {
                          const { hasThinking, thinkingContent, mainContent, isComplete } = extractThinkingContent(msg.content);
                          
                          if (hasThinking) {
                            return (
                              <>
                                <div className="mb-2 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                                  <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 flex items-center justify-between cursor-pointer"
                                    onClick={(e) => {
                                      const content = e.currentTarget.nextElementSibling;
                                      content.style.display = content.style.display === 'none' ? 'block' : 'none';
                                      const arrow = e.currentTarget.querySelector('svg');
                                      arrow.classList.toggle('rotate-180');
                                    }}>
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                      <span>Reasoning</span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        ({isComplete ? 'click to expand' : 'processing...'})
                                      </span>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                  <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900" style={{ display: 'none' }}>
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        code({node, inline, className, children, ...props}) {
                                          const match = /language-(\w+)/.exec(className || '');
                                          return !inline && match ? (
                                            <div className="relative">
                                              <CopyButton content={String(children).replace(/\n$/, '')} />
                                              <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                language={match[1]}
                                                PreTag="div"
                                                {...props}
                                              >
                                                {String(children).replace(/\n$/, '')}
                                              </SyntaxHighlighter>
                                            </div>
                                          ) : (
                                            <code className={className} {...props}>
                                              {children}
                                            </code>
                                          );
                                        }
                                      }}
                                    >
                                      {thinkingContent}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                                {mainContent && (
                                  <div className="mt-2">
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        code({node, inline, className, children, ...props}) {
                                          const match = /language-(\w+)/.exec(className || '');
                                          return !inline && match ? (
                                            <div className="relative">
                                              <CopyButton content={String(children).replace(/\n$/, '')} />
                                              <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                language={match[1]}
                                                PreTag="div"
                                                {...props}
                                              >
                                                {String(children).replace(/\n$/, '')}
                                              </SyntaxHighlighter>
                                            </div>
                                          ) : (
                                            <code className={className} {...props}>
                                              {children}
                                            </code>
                                          );
                                        }
                                      }}
                                    >
                                      {mainContent}
                                    </ReactMarkdown>
                                  </div>
                                )}
                              </>
                            );
                          }
                          
                          return (
                            //remove extra padding from user query
                            <div className="[&>p]:my-0 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                  code({node, inline, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                      <div className="syntax-highlight-container">
                                        <CopyButton content={String(children).replace(/\n$/, '')} />
                                        <SyntaxHighlighter
                                          style={vscDarkPlus}
                                          language={match[1]}
                                          PreTag="div"
                                          {...props}
                                        >
                                          {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                      </div>
                                    ) : (
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    );
                                  }
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )
              ))}

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
      
      {/* Fixed input area at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 bg-opacity-50">
        <div className="max-w-3xl mx-auto px-4 pb-4">
          <UserInput 
            onMessageSent={onMessageSent} 
            messages={messages} 
            personalization={personalization}
          />
        </div>
      </div>
    </div>
  );
}
