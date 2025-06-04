'use client';

import { useState, useCallback, useEffect } from 'react';
import UserInput from '@/components/UserInput';
import Conversation from '@/components/Conversation';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  const [initialMessages, setInitialMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('conversation');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages)) {
          setInitialMessages(parsedMessages);
          setMessages(parsedMessages);
        }
      } catch (e) {
        console.error('Failed to parse saved conversation', e);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('conversation', JSON.stringify(messages));
    }
  }, [messages]);

  const addMessages = useCallback(async (newMsgs, isThinkingState = false) => {
    // If this is just a thinking state update
    if (isThinkingState) {
      setIsThinking(true);
      return;
    }
    
    // For actual messages
    const isAssistantResponse = newMsgs[0]?.role === 'assistant';
    
    // Add the message to state
    setMessages(prev => [...prev, ...newMsgs]);
    
    if (isAssistantResponse) {
      // Start streaming for assistant messages
      setIsStreaming(true);
      
      // Stop thinking when we start streaming
      setIsThinking(false);
      
      // Stop streaming after a short delay
      const timer = setTimeout(() => {
        setIsStreaming(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">      
      <main className="flex-1 overflow-y-auto py-4">
        <div className="max-w-3xl mx-auto">
          <Conversation messages={messages} isThinking={isThinking} isStreaming={isStreaming} />
        </div>
      </main>
      
      <div className="sticky bottom-0">
        <div className="max-w-3xl mx-auto py-4 bg-gray-50 dark:bg-gray-900">
          <UserInput 
            onMessageSent={addMessages} 
            messages={messages}
          />
        </div>
      </div>
    </div>
  );
}
