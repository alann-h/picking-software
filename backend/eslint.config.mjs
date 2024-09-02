import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";

export default [
  { files: ["**/*.{js,mjs,cjs,jsx}"] },
  { languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
  { languageOptions: { globals: {...globals.browser, ...globals.node, Intl: 'readonly'} } },
  pluginJs.configs.recommended,
  pluginReactConfig,
  {
    rules: {
      "semi": ["error", "always"]
    }
  }
];