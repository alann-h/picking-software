import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";

export default [
  // 1. Global ignores
  {
    ignores: ["node_modules/", "dist/", "build/", "frontend/dist/", "backend/tests/"],
  },

  // 2. Base JS configuration
  pluginJs.configs.recommended,
  
  // 3. Node.js configuration for backend
  {
    files: ["backend/**/*.{js,cjs,mjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_" }
      ],
    }
  },

  // 4. TypeScript + React configuration for frontend
  {
    files: ["frontend/**/*.{ts,tsx}"],
    ...pluginReactConfig,
    languageOptions: {
      ...pluginReactConfig.languageOptions,
      parser: tseslint.parser,
      parserOptions: {
        project: "./frontend/tsconfig.json",
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      ...pluginReactConfig.plugins,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      
      "no-unused-vars": "off",
      
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { 
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      
      // Other React rules
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-key": "warn",
    },
  },
];