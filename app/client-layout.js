'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { getConversation, createNewConversation } from './utils/conversationStorage';
import Footer from './components/Footer';

export default function ClientLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);

  // On mount, check for chatId in URL or select the most recent conversation
  useEffect(() => {
    const urlChatId = searchParams.get('chatId');
    const convs = JSON.parse(localStorage.getItem('conversations_list') || '[]');
    
    if (urlChatId) {
      setActiveChatId(urlChatId);
    } else if (convs.length > 0) {
      // If no chatId in URL, redirect to the most recent conversation
      router.push(`${pathname}?chatId=${convs[convs.length - 1]}`);
    } else {
      // Create a new conversation if none exist
      const newConv = createNewConversation();
      router.push(`${pathname}?chatId=${newConv.id}`);
    }
  }, [pathname, router, searchParams]);

  const handleSelectChat = (id) => {
    setActiveChatId(id);
    // Update URL with the new chatId
    router.push(`${pathname}?chatId=${id}`);
    // Close sidebar on mobile when a chat is selected
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex flex-col min-h-screen">
      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex flex-1 pt-16 overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} activeChatId={activeChatId} onSelectChat={handleSelectChat} />
        <main className={`flex-1 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
          <div className="h-full flex flex-col">
          {children && typeof children === 'function'
  ? children({ activeChatId, isSidebarOpen }) // ✅ pass sidebar status
  : children}

          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
