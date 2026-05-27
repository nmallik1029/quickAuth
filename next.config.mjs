/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["argon2", "@prisma/client", "@aws-sdk/client-s3"],
};
export default nextConfig;
