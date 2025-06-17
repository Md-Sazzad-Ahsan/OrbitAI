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

  useEffect(() => {
    if (initialLoad.current && !chatId) {
      const newConversation = createNewConversation();
      router.replace(`/?chatId=${newConversation.id}`);
    }
    initialLoad.current = false;
  }, [chatId, router]);

  useEffect(() => {
    if (!chatId) return;
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

    if (newMsg.role === 'user' && messages.length === 0 && newMsg.content) {
      const newTitle = newMsg.content.substring(0, 50);
      const conversation = JSON.parse(localStorage.getItem(`conversation_${activeChatId}`) || '{}');
      if (conversation && conversation.title === 'New Chat') {
        conversation.title = newTitle;
        localStorage.setItem(`conversation_${activeChatId}`, JSON.stringify(conversation));
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
  }, [activeChatId, messages.length]);

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
              />
            </div>
          </div>
        </div>
      </div>
    </>
  ); 
}
