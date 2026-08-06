import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/projects/*/report-pdf": ["./app/fonts/PretendardPDF.ttf"],
  },
};

export default nextConfig;
