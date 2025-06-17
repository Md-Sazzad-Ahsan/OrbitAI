"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RiMenuLine, RiUserLine, RiSettingsLine, RiShieldKeyholeLine, RiLogoutBoxLine, RiLoginBoxLine } from "react-icons/ri";
import { createClient } from '@/utils/supabase/client';

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
  }, []);

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
              
              <Link href="/privacy" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                <RiShieldKeyholeLine className="mr-3 h-5 w-5 text-gray-400" />
                Privacy
              </Link>
              
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
    </header>
  );
};

export default Header;