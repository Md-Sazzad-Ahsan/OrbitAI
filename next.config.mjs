/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true
})({
  reactStrictMode: true,
  images: {
    domains: ['image.tmdb.org']
  },
  // Add other Next.js config options here
});

export default nextConfig;
