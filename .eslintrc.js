module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["google", "plugin:react/recommended", "prettier"],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
    {
      files: ["**/*.ts", "**/*.tsx"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
      extends: ["plugin:@typescript-eslint/recommended"],
      rules: {
        // JSDoc type annotations are redundant once types are in the signature.
        "valid-jsdoc": "off",
        "require-jsdoc": "off",
      },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react"],
  rules: {
    "new-cap": "off",
    "react/no-unknown-property": ["error", { ignore: ["jsx", "global"] }],
  },
};
