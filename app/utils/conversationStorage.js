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
  const conversation = {
    id,
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString()
  };
  saveConversation(conversation);
  return conversation;
}
