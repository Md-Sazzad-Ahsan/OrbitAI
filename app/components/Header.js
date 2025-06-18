"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RiMenuLine, RiUserLine, RiSettingsLine, RiShieldKeyholeLine, RiLogoutBoxLine, RiLoginBoxLine, RiCloseLine } from "react-icons/ri";
import { createClient } from '@/utils/supabase/client';

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPersonalizeModalOpen, setIsPersonalizeModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Ahsan',
    profession: 'Computer Engineer',
    traits: 'When I say Casual then i want Chat gpt to respond casual answers .When i don\'t say anything then i want GPT to answer me formally. The answer should be in short and accurate ,when i say explain or describe then i want an step by step or line by line explanation or how that is happening, because i want to learn that'
  });
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <header className={`fixed top-0 right-0 z-50 bg-white shadow-md dark:bg-gray-800 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64 left-0' : 'left-0'}`}>
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-4">
          {!isSidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="text-gray-800 hover:text-gray-600 dark:text-white dark:hover:text-gray-400"
              aria-label="Open Sidebar"
            >
              <RiMenuLine className="h-6 w-6" />
            </button>
          )}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-800 dark:text-white">
              OrbitAI
            </span>
          </Link>
        </div>
        
        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="User menu"
          >
            <RiUserLine className="w-5 h-5" />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.email || 'Not registered'}
                </p>
              </div>
              
              <Link href="/terms" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                <RiShieldKeyholeLine className="mr-3 h-5 w-5 text-gray-400" />
                Terms of Service
              </Link>

              <Link href="/privacy" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                <RiShieldKeyholeLine className="mr-3 h-5 w-5 text-gray-400" />
                Privacy Policy
              </Link>
              <Link href="/help" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                <RiShieldKeyholeLine className="mr-3 h-5 w-5 text-gray-400" />
                Help Center
              </Link>

              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsPersonalizeModalOpen(true);
                }}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <RiSettingsLine className="mr-3 h-5 w-5 text-gray-400" />
                Personalize
              </button>
              <Link href="/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                <RiSettingsLine className="mr-3 h-5 w-5 text-gray-400" />
                Settings
              </Link>
              
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <RiLogoutBoxLine className="mr-3 h-5 w-5" />
                  Log out
                </button>
              ) : (
                <Link href="/login" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <RiLoginBoxLine className="mr-3 h-5 w-5 text-gray-400" />
                  Log in
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* Personalize Modal */}
      {isPersonalizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personalize Your Experience</h2>
              <button
                onClick={() => setIsPersonalizeModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
              >
                <RiCloseLine className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What should OrbitAI call you?
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="profession" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What do you do?
                </label>
                <input
                  type="text"
                  id="profession"
                  value={formData.profession}
                  onChange={(e) => setFormData({...formData, profession: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="traits" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What traits should OrbitAI have?
                </label>
                <textarea
                  id="traits"
                  rows={6}
                  value={formData.traits}
                  onChange={(e) => setFormData({...formData, traits: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsPersonalizeModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // Here you would typically save the preferences
                  console.log('Saving preferences:', formData);
                  setIsPersonalizeModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;