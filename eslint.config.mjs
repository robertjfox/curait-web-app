import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Product images come from arbitrary remote CDNs (Serper/SerpAPI results,
      // Gemini-rendered Supabase storage URLs). Configuring `next/image` remote
      // patterns broadly enough to cover them would be effectively "allow all",
      // so `<img>` is the pragmatic choice for the MVP.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/types/api.generated.ts",
  ]),
]);

export default eslintConfig;
