'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Conversation from '@/components/Conversation';
import { createNewConversation } from './utils/conversationStorage';

export default function Home({ activeChatId: initialChatId, isSidebarOpen }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chatId');
  const initialLoad = useRef(true);
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activeChatId, setActiveChatId] = useState(chatId);
  const [personalization, setPersonalization] = useState(null);

  // Load personalization data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('orbitAI_personalization');
      if (savedData) {
        try {
          setPersonalization(JSON.parse(savedData));
        } catch (e) {
          console.error('Error parsing personalization data:', e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      if (!chatId) {
        // Always create a new chat when navigating to root URL
        const newConversation = createNewConversation();
        router.replace(`/?chatId=${newConversation.id}`);
      }
    }
  }, [chatId, router]);

  // Track the previous chat ID to clean up empty chats
  const prevChatIdRef = useRef(activeChatId);

  useEffect(() => {
    if (!chatId) return;
    
    // Clean up the previous chat if it was empty
    const prevChatId = prevChatIdRef.current;
    if (prevChatId && prevChatId !== chatId) {
      const prevConversation = JSON.parse(localStorage.getItem(`conversation_${prevChatId}`) || '{}');
      if (prevConversation && (!prevConversation.messages || prevConversation.messages.length === 0)) {
        // Remove the empty conversation
        localStorage.removeItem(`conversation_${prevChatId}`);
        // Update the conversations list
        const convs = JSON.parse(localStorage.getItem('conversations_list') || '[]');
        const updatedConvs = convs.filter(id => id !== prevChatId);
        if (updatedConvs.length !== convs.length) {
          localStorage.setItem('conversations_list', JSON.stringify(updatedConvs));
          window.dispatchEvent(new Event('storage'));
        }
      }
    }
    
    // Update the previous chat ID
    prevChatIdRef.current = chatId;
    
    // Load the new chat
    setMessages([]);
    setIsThinking(false);
    setActiveChatId(chatId);
    const timer = setTimeout(() => {
      const conversation = JSON.parse(localStorage.getItem(`conversation_${chatId}`) || '{}');
      if (conversation?.messages) {
        setMessages(conversation.messages);
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [chatId]);

  useEffect(() => {
    if (!activeChatId) return;
    const handleStorageChange = (e) => {
      if (e.key && !e.key.startsWith(`conversation_${activeChatId}`)) return;
      const conversation = JSON.parse(localStorage.getItem(`conversation_${activeChatId}`) || '{}');
      if (conversation?.messages) {
        setMessages(conversation.messages);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [activeChatId]);

  useEffect(() => {
    if (messages.length > 0 && activeChatId) {
      const conversation = JSON.parse(localStorage.getItem(`conversation_${activeChatId}`) || '{}');
      conversation.id = activeChatId;
      conversation.messages = messages;
      localStorage.setItem(`conversation_${activeChatId}`, JSON.stringify(conversation));

      const convs = JSON.parse(localStorage.getItem('conversations_list') || '[]');
      if (!convs.includes(activeChatId)) {
        convs.push(activeChatId);
        localStorage.setItem('conversations_list', JSON.stringify(convs));
      }
    }
  }, [messages, activeChatId]);

  const handleMessageSent = useCallback((newMsgs, isStreaming) => {
    setIsThinking(isStreaming);
    const newMsg = newMsgs[0];

    // Only update title if this is the first message in the conversation
    if (newMsg.role === 'user' && messages.length === 0 && newMsg.content) {
      const newTitle = newMsg.content.substring(0, 50);
      const conversation = JSON.parse(localStorage.getItem(`conversation_${activeChatId}`) || '{}');
      if (conversation) {
        // Only update title if it's still the default
        if (conversation.title === 'New Chat') {
          conversation.title = newTitle;
          conversation.updatedAt = new Date().toISOString();
          localStorage.setItem(`conversation_${activeChatId}`, JSON.stringify(conversation));
          window.dispatchEvent(new Event('storage'));
        }
      } else {
        // If conversation doesn't exist, create it with the first message
        const newConversation = {
          id: activeChatId,
          title: newTitle,
          messages: [...messages, ...newMsgs],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`conversation_${activeChatId}`, JSON.stringify(newConversation));
        
        // Add to conversations list if not present
        const convs = JSON.parse(localStorage.getItem('conversations_list') || '[]');
        if (!convs.includes(activeChatId)) {
          convs.unshift(activeChatId); // Add to beginning of array
          localStorage.setItem('conversations_list', JSON.stringify(convs));
        }
        window.dispatchEvent(new Event('storage'));
      }
    }

    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (newMsg.role === 'assistant' && last?.role === 'assistant') {
        const updated = [...prev];
        updated[updated.length - 1] = newMsg;
        return updated;
      } else {
        return [...prev, ...newMsgs];
      }
    });
  }, [activeChatId, messages]);

  return (
    <>
      {/* Conversation container: moves with sidebar */}
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <div className="max-h-screen flex flex-col">
          <div className="flex-1 px-4">
            <div className="max-w-3xl mx-auto w-full py-4">
              <Conversation 
                messages={messages} 
                isThinking={isThinking} 
                onMessageSent={handleMessageSent}
                personalization={personalization}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  ); 
}
