import React from 'react';
import Link from 'next/link';
import { FiHome } from 'react-icons/fi';

export const metadata = {
  title: 'Terms and Conditions - OrbitAI',
  description: 'Read the terms and conditions for using OrbitAI services.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
            Terms and Conditions
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300 sm:mt-4">
            Effective Date: June 18, 2025
          </p>
          <hr/>
        </div>

        <div className="bg-transparent overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="prose dark:prose-invert max-w-none">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using OrbitAI, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, do not use our services.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                OrbitAI provides AI-powered assistance and related services. The service may change from time to time at our discretion.
              </p>

              <h2>3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </p>

              <h2>4. User Conduct</h2>
              <p>You agree not to use the service to:</p>
              <ul>
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful or malicious code</li>
                <li>Interfere with the service&apos;s operation</li>
              </ul>

              <h2>5. Intellectual Property</h2>
              <p>
                All content included on the service, such as text, graphics, logos, and software, is the property of OrbitAI or its content suppliers and protected by intellectual property laws.
              </p>

              <h2>6. Limitation of Liability</h2>
              <p>
                In no event shall OrbitAI be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the service.
              </p>

              <h2>7. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Your continued use of the service after such changes constitutes your acceptance of the new terms.
              </p>

              <h2>8. Governing Law</h2>
              <p>
                These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which OrbitAI operates, without regard to its conflict of law provisions.
              </p>

              <h2>9. Contact Information</h2>
              <p>
                If you have any questions about these Terms and Conditions, please contact us at support@orbitai.com.
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
