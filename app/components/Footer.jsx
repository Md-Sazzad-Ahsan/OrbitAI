'use client';

import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-transparent py-1">
      <div className="container mx-auto max-w-7xl">

        <div className="text-center text-xs text-gray-400 dark:text-gray-600 opacity-70 flex justify-center space-x-1 mx-auto max-w-2xl">
          <p>&copy; {new Date().getFullYear()} OrbitAI. All rights reserved.</p>
          <p>Developed by <a href="https://ahsans-portfolio.vercel.app/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500 text-xs">Md. Sazzad Ahsan</a></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
