import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // Disable the specific accessibility warnings cluttering your screen
      "jsx-a11y/alt-text": "off",
      "jsx-a11y/role-has-required-aria-props": "off",
      "@next/next/no-img-element": "off"
    }
  }
]);