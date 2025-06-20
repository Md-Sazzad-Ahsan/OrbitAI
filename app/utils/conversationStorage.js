// Utility functions for managing conversations in localStorage

const CONVERSATIONS_KEY = 'conversations_list';
const CONVERSATION_PREFIX = 'conversation_';

export function getAllConversations() {
  const ids = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || '[]');
  return ids.map(id => {
    const conv = JSON.parse(localStorage.getItem(CONVERSATION_PREFIX + id) || '{}');
    return conv && conv.id ? conv : null;
  }).filter(Boolean)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export function getConversation(id) {
  return JSON.parse(localStorage.getItem(CONVERSATION_PREFIX + id) || 'null');
}

export function saveConversation(conversation) {
  if (!conversation || !conversation.id) return;
  localStorage.setItem(CONVERSATION_PREFIX + conversation.id, JSON.stringify(conversation));
  let ids = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || '[]');
  if (!ids.includes(conversation.id)) {
    ids.push(conversation.id);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(ids));
  }
}

export function updateConversationTitle(id, newTitle) {
  const conv = getConversation(id);
  if (conv) {
    conv.title = newTitle;
    saveConversation(conv);
  }
}

export function deleteConversation(id) {
  localStorage.removeItem(CONVERSATION_PREFIX + id);
  let ids = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || '[]');
  ids = ids.filter(cid => cid !== id);
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(ids));
}

export function createNewConversation() {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  // Get personalization data from localStorage
  const getPersonalization = () => {
    if (typeof window === 'undefined') return {};
    
    try {
      const savedData = localStorage.getItem('orbitAI_personalization');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (e) {
      console.error('Error loading personalization data:', e);
    }
    return {};
  };

  // Get personalization data immediately
  const personalization = getPersonalization();

  const conversation = {
    id,
    title: 'New Chat',
    messages: [],
    personalization: {
      name: personalization.name || '',
      profession: personalization.profession || '',
      traits: personalization.traits || '',
      additionalInfo: personalization.additionalInfo || ''
    },
    createdAt: new Date().toISOString()
  };
  
  // Save the conversation
  saveConversation(conversation);
  
  // Double-check and update personalization after a short delay to ensure we have the latest data
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      const updatedPersonalization = getPersonalization();
      if (JSON.stringify(updatedPersonalization) !== JSON.stringify(personalization)) {
        const updatedConversation = {
          ...conversation,
          personalization: {
            name: updatedPersonalization.name || '',
            profession: updatedPersonalization.profession || '',
            traits: updatedPersonalization.traits || '',
            additionalInfo: updatedPersonalization.additionalInfo || ''
          }
        };
        saveConversation(updatedConversation);
      }
    }, 100);
  }
  
  return conversation;
}
