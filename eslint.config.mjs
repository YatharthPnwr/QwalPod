import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, // {
...nextTypescript, //   files: ["**/generated/prisma/**"],
//   rules: {
//     "@typescript-eslint/no-unused-vars": "off",
//     "@typescript-eslint/no-require-imports": "off",
//     "@typescript-eslint/no-unused-expressions": "off",
//     "@typescript-eslint/no-this-alias": "off",
//     "@typescript-eslint/no-explicit-any": "off",
//   },
// },
{
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
}];

export default eslintConfig;
