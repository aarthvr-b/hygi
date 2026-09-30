import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This repo curates its own agent instructions (CLAUDE.md, AGENTS.md,
  // docs/agents/); don't let `next dev`/`next build` inject into them.
  agentRules: false,
};

export default nextConfig;
