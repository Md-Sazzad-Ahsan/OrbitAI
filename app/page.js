'use client';

import { useState } from 'react';
import UserInput from '@/components/UserInput';
import Conversation from '@/components/Conversation';

export default function Home() {
  const [messages, setMessages] = useState([]);

  const addMessages = (newMsgs) => {
    setMessages((prev) => [...prev, ...newMsgs]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">      
      <main className="flex-1 overflow-y-auto py-4">
        <div className="max-w-3xl mx-auto">
          <Conversation messages={messages} />
        </div>
      </main>
      
      <div className="sticky bottom-0">
        <div className="max-w-3xl mx-auto p-4">
          <UserInput 
            onMessageSent={addMessages} 
            messages={messages}
          />
        </div>
      </div>
    </div>
  );
}
