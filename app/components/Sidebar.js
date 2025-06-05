import { PiDotsThreeVerticalBold } from "react-icons/pi";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { useState, useEffect, useRef } from 'react';
import { BsArrowLeftSquare } from "react-icons/bs";
import {
  getAllConversations,
  createNewConversation,
  deleteConversation,
  updateConversationTitle,
} from '../utils/conversationStorage';

const Sidebar = ({ isOpen, toggleSidebar, onSelectChat, activeChatId }) => {
  const [conversations, setConversations] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const dropdownButtonRefs = useRef({});
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Load conversations from localStorage
  useEffect(() => {
    setConversations(getAllConversations());
    // Listen for changes from other tabs/windows
    const handleStorage = () => setConversations(getAllConversations());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Helper to refresh list
  const refreshConversations = () => setConversations(getAllConversations());

  // Only close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownOpen && !event.target.closest('.sidebar-dropdown-menu') && !event.target.closest('.dropdown-trigger')) {
        setDropdownOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleDotsClick = (chatId) => (e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === chatId ? null : chatId);
  };

  const handleSelectChat = (id) => {
    if (onSelectChat) {
      onSelectChat(id);
      // Update the URL with the new chatId
      window.history.pushState({}, '', `/?chatId=${id}`);
    }
  };

  const handleNewChat = () => {
    const newConv = createNewConversation();
    refreshConversations();
    if (onSelectChat) {
      onSelectChat(newConv.id);
    }
  };

  const handleEditChatTitle = (id, title) => {
    updateConversationTitle(id, title);
    refreshConversations();
  };

  const handleDeleteChat = (id) => {
    deleteConversation(id);
    refreshConversations();
    // Optionally, auto-select another chat or clear selection
    if (onSelectChat && conversations.length > 1) {
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) onSelectChat(remaining[0].id);
    }
  };

  return (
    <>
      {/* Backdrop for mobile - clickable to close sidebar */}
      <div
        className={`bg-gray-100 dark:bg-gray-900 shadow-lg z-50 lg:z-30 fixed top-0 left-0 bottom-0 transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          w-64 overflow-hidden
          lg:translate-x-0
          lg:fixed
        `}
        style={{ width: isOpen ? '16rem' : '0' }}
        onClick={e => e.stopPropagation()}
      >
        {isOpen && (
          <div className="flex flex-col h-full">
            <div className="h-16 flex items-center justify-between px-4">
              <span className="text-lg font-medium text-gray-800 dark:text-gray-200">Chats</span>
              <button
                onClick={toggleSidebar}
                className="text-gray-500 hover:text-gray-100 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-sm hover:bg-gray-400 dark:hover:bg-gray-600"
                aria-label="Close Sidebar"
              >
                <BsArrowLeftSquare className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              <button
                className="w-full py-2 text-sm font-medium text-white bg-gray-500 dark:bg-gray-800 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center shadow-md border border-gray-500 dark:border-gray-600"
                onClick={handleNewChat}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {conversations && conversations.length > 0 ? (
                  conversations.map(chat => (
                    <div
                      key={chat.id}
                      className={`p-3 rounded-md cursor-pointer truncate flex flex-col ${
                        chat.id === activeChatId
                          ? 'bg-gray-100 dark:bg-gray-800' 
                          : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => handleSelectChat(chat.id)}
                        >
                          {editingChatId === chat.id ? (
                            <input
                              className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-800"
                              value={editingTitle}
                              autoFocus
                              onChange={e => setEditingTitle(e.target.value)}
                              onBlur={() => {
                                const trimmed = editingTitle.trim();
                                handleEditChatTitle(chat.id, trimmed || 'Untitled Chat');
                                setEditingChatId(null);
                                setEditingTitle('');
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const trimmed = editingTitle.trim();
                                  handleEditChatTitle(chat.id, trimmed || 'Untitled Chat');
                                  setEditingChatId(null);
                                  setEditingTitle('');
                                }
                                if (e.key === 'Escape') {
                                  setEditingChatId(null);
                                  setEditingTitle('');
                                }
                              }}
                            />
                          ) : (
                            <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{chat.title || 'Untitled Chat'}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          ref={el => (dropdownButtonRefs.current[chat.id] = el)}
                          className="dropdown-trigger p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ml-2"
                          onClick={handleDotsClick(chat.id)}
                        >
                          <PiDotsThreeVerticalBold className="h-5 w-5" />
                        </button>
                      </div>
                      {dropdownOpen !== null && dropdownOpen === chat.id && (
                        <div className="sidebar-dropdown-menu flex flex-row items-end justify-end gap-2 mt-2 px-2 pt-1 border-t border-gray-50 dark:border-gray-700 z-50 sm:flex" onClick={e => e.stopPropagation()}>
                          <button
                            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Edit Title"
                            onClick={() => {
                              setEditingChatId(chat.id);
                              setEditingTitle(chat?.title || '');
                              setDropdownOpen(null);
                            }}
                          >
                            <FiEdit2 className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                          </button>
                          <button
                            className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900"
                            title="Delete Chat"
                            onClick={() => {
                              setDropdownOpen(null);
                              handleDeleteChat(chat.id);
                            }}
                          >
                            <FiTrash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400">No chats yet.</div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">User Profile</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;