import React from 'react';
import Link from 'next/link';
import { FiHome } from 'react-icons/fi';

export const metadata = {
  title: 'Privacy Policy - OrbitAI',
  description: 'Learn about how we protect your privacy and handle your data at OrbitAI.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300 sm:mt-4">
            Last updated: June 18, 2025
          </p>
          <hr/>
        </div>

        <div className="bg-transparent overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="prose dark:prose-invert max-w-none">
              <h2>1. Information We Collect</h2>
              <p>
                We collect information that you provide directly to us when you use our services, such as when you create an account, update your profile, or communicate with us. This may include your name, email address, and any other information you choose to provide.
              </p>

              <h2>2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul>
                <li>Provide, maintain, and improve our services</li>
                <li>Personalize your experience</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Send you technical notices and support messages</li>
              </ul>

              <h2>3. Information Sharing</h2>
              <p>
                We do not share your personal information with third parties except as described in this Privacy Policy or with your consent.
              </p>

              <h2>4. Security</h2>
              <p>
                We take reasonable measures to help protect personal information from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
              </p>

              <h2>5. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. If we make changes, we will notify you by revising the date at the top of the policy and, in some cases, we may provide additional notice.
              </p>

              <h2>6. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at privacy@orbitai.com.
              </p>

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
      </div>
    </div>
  );
}
