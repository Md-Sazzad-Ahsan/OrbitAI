"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { FiChevronDown, FiChevronUp, FiHome } from 'react-icons/fi';

// export const metadata = {
//   title: 'Help Center - OrbitAI',
//   description: 'Get help and find answers to common questions about OrbitAI.',
// };

const FAQItem = ({ question, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-4">
      <button
        className="flex justify-between items-center w-full text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{question}</h3>
        {isOpen ? (
          <FiChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <FiChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="mt-2 text-gray-600 dark:text-gray-300">
          {children}
        </div>
      )}
    </div>
  );
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
            Help Center
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300 sm:mt-4">
            Find answers to common questions
          </p>
          <hr className="my-6" />
        </div>

        <div className="bg-transparent overflow-hidden rounded-lg">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
            
            <FAQItem question="How do I get started with OrbitAI?">
              <p>To get started, simply create an account and log in. You can then start using OrbitAI by typing your questions or commands in the chat interface.</p>
            </FAQItem>

            <FAQItem question="Is my data secure with OrbitAI?">
              <p>Yes, we take your privacy and data security very seriously. All your data is encrypted and stored securely. Please refer to our <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link> for more details.</p>
            </FAQItem>

            <FAQItem question="What can I use OrbitAI for?">
              <p>OrbitAI can help with a wide range of tasks including answering questions, generating content, coding assistance, and more. Try asking it anything!</p>
            </FAQItem>

            <FAQItem question="How can I customize my experience?">
              <p>You can personalize your experience by clicking on your profile picture and selecting 'Personalize'. Here you can set your preferences for how OrbitAI interacts with you.</p>
            </FAQItem>

            <FAQItem question="Is there a mobile app available?">
              <p>Currently, OrbitAI is available as a web application that works on both desktop and mobile browsers. We're working on dedicated mobile apps which will be available soon.</p>
            </FAQItem>

            <FAQItem question="How can I contact support?">
              <p>If you need further assistance, please email us at support@orbitai.com and our team will get back to you as soon as possible.</p>
            </FAQItem>
          </div>

          <div className="mt-12 text-center">
            <Link 
              href="/" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiHome className="mr-2 -ml-1 h-5 w-5" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
