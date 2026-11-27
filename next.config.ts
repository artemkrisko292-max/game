import type { NextConfig } from "next";

// Игра полностью работает в браузере, поэтому собирается в статический сайт (папка out/).
// Для GitHub Pages адрес сайта — /<имя-репозитория>/, его передаёт NEXT_PUBLIC_BASE_PATH.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
