'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] p-4">
      <h1 className="text-4xl font-bold text-center text-gray-800 dark:text-white mb-6">
        Welcome to OrbitAI
      </h1>
      <p className="text-lg text-center text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
        Your AI-powered platform for movie and drama recommendations
      </p>
    </div>
  );
}