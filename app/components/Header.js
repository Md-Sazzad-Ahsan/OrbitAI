import Link from 'next/link';
import { RiMenuLine } from "react-icons/ri";

const Header = ({ toggleSidebar, isSidebarOpen }) => {
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
      </div>
    </header>
  );
};

export default Header; 