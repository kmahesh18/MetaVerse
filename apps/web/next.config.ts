import type { NextConfig } from "next";
import path from 'path';
import dotenv from 'dotenv';

// Inject root .env into process.env so Next.js can pick up NEXT_PUBLIC_ defaults
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@metaverse/shared'],
  images: { unoptimized: true },
};

export default nextConfig;
