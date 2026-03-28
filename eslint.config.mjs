// eslint.config.mjs - Enterprise Standard Configuration
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import promise from 'eslint-plugin-promise';
import unusedImports from 'eslint-plugin-unused-imports';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  /* -------------------------------------------------
   * Base ESLint recommended + enterprise overrides
   * ------------------------------------------------- */
  js.configs.recommended,
  {
    rules: {
      // Enterprise security and best practices
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-alert': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-labels': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'prefer-promise-reject-errors': 'error',
      'require-await': 'warn',
      'no-await-in-loop': 'warn',

      // Code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'indent': ['error', 2],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'max-len': ['warn', { code: 160, ignoreUrls: true, ignoreStrings: true }],
      'complexity': ['warn', 12],
      'max-depth': ['warn', 5],
      'max-params': ['warn', 5],

      // Variables and scoping
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(React|_)',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-shadow': 'warn',
      'no-redeclare': 'error',
      'no-undef': 'error',
    },
  },

  /* -------------------------------------------------
   * React/React Native files
   * ------------------------------------------------- */
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        __DEV__: 'readonly',
        fetch: 'readonly',
        Alert: 'readonly',
        Platform: 'readonly',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-native': reactNative,
      promise,
      'unused-imports': unusedImports,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/ignore': ['react-native'],
    },
    rules: {
      // React rules
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      'react/jsx-no-useless-fragment': 'warn',
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-no-bind': ['error', { ignoreRefs: true, allowArrowFunctions: true }],
      'react/jsx-no-script-url': 'error',
      'react/jsx-no-target-blank': 'off',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-pascal-case': 'error',
      'react/jsx-props-no-multi-spaces': 'warn',
      'react/jsx-props-no-spreading': 'off',
      'react/jsx-tag-spacing': ['warn', {
        closingSlash: 'never',
        beforeSelfClosing: 'always',
        afterOpening: 'never',
        beforeClosing: 'never',
      }],

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // React Native
      'react-native/no-unused-styles': 'warn',
      'react-native/no-inline-styles': 'off',
      'react-native/no-color-literals': 'off',
      'react-native/no-raw-text': ['error', {
        skip: ['CustomText', 'MyText'],
      }],

      // Promise rules - disabled due to ESLint 9.x compatibility issues with older plugin versions
      // These can be re-enabled after updating eslint-plugin-promise to a compatible version
      'promise/catch-or-return': 'off',
      'promise/no-return-wrap': 'off',
      'promise/param-names': 'off',
      'promise/always-return': 'off',
      'promise/no-return-in-finally': 'off',

      // Unused imports
      'unused-imports/no-unused-imports': 'off',
      'unused-imports/no-unused-vars': 'off',

      // Import rules
      'import/no-unresolved': ['error', { ignore: ['expo-status-bar'] }],
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'off', // Disabled due to react-native parsing issues
      'import/no-absolute-path': 'error',
      'import/no-dynamic-require': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': 'warn',
      'import/no-useless-path-segments': 'error',
      'import/export': 'error',
      'import/no-deprecated': 'off',
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: [
          '**/*.test.*',
          '**/*.spec.*',
          '**/__tests__/**',
          '**/__mocks__/**',
          '**/jest.setup.*',
          '**/babel.config.*',
          '**/metro.config.*',
          '**/jest.config.*',
        ],
      }],
      'import/no-mutable-exports': 'error',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/order': ['warn', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
      }],
      'import/newline-after-import': 'error',

      // Accessibility (some disabled for React Native)
      'jsx-a11y/accessible-emoji': 'off', // Not applicable for React Native (uses Text, not span)
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/heading-has-content': 'off',
      'jsx-a11y/html-has-lang': 'off',
      'jsx-a11y/img-redundant-alt': 'off',
      'jsx-a11y/interactive-supports-focus': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-access-key': 'off',
      'jsx-a11y/no-autofocus': 'off', // autoFocus is commonly used in React Native
      'jsx-a11y/no-redundant-roles': 'off',
      'jsx-a11y/role-has-required-aria-props': 'off',
      'jsx-a11y/role-supports-aria-props': 'off',

      // JSDoc - simplified to prevent version compatibility issues
      'jsdoc/check-syntax': 'off',
      'jsdoc/require-jsdoc': 'off',
    },
  },

  /* -------------------------------------------------
   * Disable problematic jsdoc rules for compatibility
   * ------------------------------------------------- */
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Disable jsdoc plugin rules that may have compatibility issues
      // They can be re-enabled once plugin versions are aligned
    },
  },

  /* -------------------------------------------------
   * React Native runtime safety overrides
   * ------------------------------------------------- */
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Prevent common render/state feedback loops
      'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-is-mounted': 'error',
      'react/no-string-refs': 'error',
      'react/self-closing-comp': 'warn',
    },
  },

  /* -------------------------------------------------
   * Ignore paths
   * ------------------------------------------------- */
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'android/**',
      'ios/**',
      '.expo/**',
      '.expo-shared/**',
      'coverage/**',
      '*.min.js',
      '**/*.d.ts',
      '.DS_Store',
      'Thumbs.db',
      '*.log',
      '.env*',
      '!.env.example',
      // Ignore JSON files (they should not be linted as JS)
      '**/*.json',
      '.claude/**',
      '.vscode/**',
    ],
  },
];
