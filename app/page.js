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

    const handleMessageSent = useCallback((newMsgs, isStreaming) => {
    // Set the thinking state for the UI
    setIsThinking(isStreaming);

    const newMsg = newMsgs[0];

    // Update chat title if this is the first user message
    if (newMsg.role === 'user' && messages.length === 0 && newMsg.content) {
      const newTitle = newMsg.content.substring(0, 50);
      const conversation = JSON.parse(localStorage.getItem(`conversation_${activeChatId}`) || '{}');
      if (conversation && conversation.title === 'New Chat') {
        conversation.title = newTitle;
        localStorage.setItem(`conversation_${activeChatId}`, JSON.stringify(conversation));
        window.dispatchEvent(new Event('storage'));
      }
    }

    setMessages(prevMessages => {
      const lastMessage = prevMessages.length > 0 ? prevMessages[prevMessages.length - 1] : null;

      // If the new message is from the assistant and the last message is also from the assistant,
      // it's a streaming update. Replace the last message.
      if (newMsg.role === 'assistant' && lastMessage && lastMessage.role === 'assistant') {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1] = newMsg;
        return updatedMessages;
      } else {
        // Otherwise, it's a new message (user's first message, or the initial empty assistant message).
        return [...prevMessages, ...newMsgs];
      }
    });
  }, [activeChatId, messages.length]);

  return (
    <div className="flex flex-col h-screen">
      {/* Main content area with padding for header */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-4">
          <div className="max-w-3xl mx-auto w-full py-4">
            <Conversation messages={messages} isThinking={isThinking} />
          </div>
        </div>
      </div>
      
      {/* Fixed input at bottom */}
      <div className="w-full bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-900 dark:to-transparent">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-0 pb-4">
          <UserInput 
            onMessageSent={handleMessageSent} 
            messages={messages}
          />
        </div>
      </div>
    </div>
  );
}
