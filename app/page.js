'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UserInput from '@/components/UserInput';
import Conversation from '@/components/Conversation';
import { createNewConversation } from './utils/conversationStorage';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chatId');
  const initialLoad = useRef(true);
  
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeChatId, setActiveChatId] = useState(chatId);

  // Handle initial load and page refresh
  useEffect(() => {
    // Only run this effect on initial load or when chatId changes
    if (initialLoad.current && !chatId) {
      const newConversation = createNewConversation();
      router.replace(`/?chatId=${newConversation.id}`);
    }
    initialLoad.current = false;
  }, [chatId, router]);
  
  // Update activeChatId and load messages when URL changes
  useEffect(() => {
    if (!chatId) return;
    
    // Clear current messages immediately when chatId changes
    setMessages([]);
    setIsStreaming(false);
    setIsThinking(false);
    
    // Set the new active chat ID
    setActiveChatId(chatId);
    
    // Load the new conversation after a small delay to ensure the UI updates
    const timer = setTimeout(() => {
      const conversation = JSON.parse(localStorage.getItem(`conversation_${chatId}`) || '{}');
      if (conversation && conversation.messages) {
        setMessages(conversation.messages);
      } else {
        setMessages([]);
      }
    }, 10);
    
    return () => clearTimeout(timer);
  }, [chatId]);
  
  // Listen for changes to the current conversation
  useEffect(() => {
    if (!activeChatId) return;
    
    const handleStorageChange = (e) => {
      // Skip if this is a different conversation
      if (e.key && !e.key.startsWith(`conversation_${activeChatId}`) && e.key !== 'conversations_list') {
        return;
      }
      
      const conversation = JSON.parse(localStorage.getItem(`conversation_${activeChatId}`) || '{}');
      if (conversation && conversation.messages) {
        setMessages(conversation.messages);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activeChatId]);

  // Save messages to the current conversation in localStorage
  useEffect(() => {
    if (messages.length > 0 && activeChatId) {
      const conversation = JSON.parse(localStorage.getItem(`conversation_${activeChatId}`) || '{}');
      conversation.id = activeChatId;
      conversation.messages = messages;
      localStorage.setItem(`conversation_${activeChatId}`, JSON.stringify(conversation));
      
      // Update conversations list
      let convs = JSON.parse(localStorage.getItem('conversations_list') || '[]');
      if (!convs.includes(activeChatId)) {
        convs.push(activeChatId);
        localStorage.setItem('conversations_list', JSON.stringify(convs));
      }
    }
  }, [messages, activeChatId]);

  const addMessages = useCallback(async (newMsgs, isThinkingState = false) => {
    // If this is just a thinking state update
    if (isThinkingState) {
      setIsThinking(true);
      return;
    }
    
    // For actual messages
    const isAssistantResponse = newMsgs[0]?.role === 'assistant';
    
    // Update chat title if this is the first user message
    if (!isAssistantResponse && messages.length === 0 && newMsgs[0]?.content) {
      const newTitle = newMsgs[0].content.substring(0, 50); // Use first 50 chars as title
      const conversation = JSON.parse(localStorage.getItem(`conversation_${activeChatId}`) || '{}');
      if (conversation && conversation.title === 'New Chat') {
        conversation.title = newTitle;
        localStorage.setItem(`conversation_${activeChatId}`, JSON.stringify(conversation));
        
        // Trigger a storage event to update the sidebar
        window.dispatchEvent(new Event('storage'));
      }
    }
    
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
  }, [activeChatId, messages.length]);

  return (
    <div className="flex flex-col h-screen">
      {/* Main content area with padding for header */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-4">
          <div className="max-w-3xl mx-auto w-full py-4">
            <Conversation messages={messages} isThinking={isThinking} isStreaming={isStreaming} />
          </div>
        </div>
      </div>
      
      {/* Fixed input at bottom */}
      <div className="w-full bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-900 dark:to-transparent">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-0 pb-4">
          <UserInput 
            onMessageSent={addMessages} 
            messages={messages}
          />
        </div>
      </div>
    </div>
  );
}
