'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import UserInput from '@/components/UserInput';
import Conversation from '@/components/Conversation';

export default function Home() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chatId');
  
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeChatId, setActiveChatId] = useState(chatId);
  
  // Update activeChatId when URL changes
  useEffect(() => {
    setActiveChatId(chatId);
  }, [chatId]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeChatId) return;
    
    const loadConversation = () => {
      const conversation = JSON.parse(localStorage.getItem(`conversation_${activeChatId}`) || '{}');
      if (conversation && conversation.messages) {
        setMessages(conversation.messages);
      } else {
        setMessages([]);
      }
    };

    // Load the conversation
    loadConversation();

    // Listen for changes to this specific conversation
    const handleStorageChange = (e) => {
      if (e.key === `conversation_${activeChatId}` || e.key === 'conversations_list') {
        loadConversation();
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
