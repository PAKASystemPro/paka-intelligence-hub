/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Exclude Supabase functions from the build
  webpack: (config, { isServer }) => {
    // Add a rule to ignore Supabase Edge Functions
    config.module.rules.push({
      test: /supabase\/functions\/.+/,
      loader: 'ignore-loader',
    });
    
    return config;
  },
};

module.exports = nextConfig;
