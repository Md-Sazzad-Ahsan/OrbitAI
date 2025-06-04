'use client';

import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Conversation({ messages = [] }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Filter out any empty or invalid messages
  const validMessages = messages.filter(msg => msg && msg.role && msg.content);

  return (
    <div className="w-full bg-transparent">
      <div className="max-w-3xl mx-auto">
        {validMessages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4 mt-40">
            Start a conversation with OrbitAI
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {validMessages.map((msg, idx) => (
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
          </div>
        )}
        <div ref={endRef} className="h-4" />
      </div>
    </div>
  );
}
