'use client';

import { useState } from 'react';
import { IoCopyOutline, IoCopy } from "react-icons/io5";

export default function CopyButton({ content, className = '' }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className={`absolute top-2 right-2 p-1.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${className}`}
      title="Copy to clipboard"
      aria-label="Copy code to clipboard"
    >
      {copied ? (
        <IoCopy className="h-4 w-4 text-gray-500 dark:text-gray-100" />
      ) : (
        <IoCopyOutline className="h-4 w-4 text-gray-500 dark:text-gray-100" />
      )}
    </button>
  );
}
