/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable environment variable exposure to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};

export default nextConfig;
