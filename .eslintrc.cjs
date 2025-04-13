module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier', // Integración con Prettier
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
    'prettier', // Plugin de Prettier
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // Reglas específicas de React
    'react/prop-types': 'off', // No necesitamos prop-types con TypeScript
    'react/react-in-jsx-scope': 'off', // No es necesario importar React en React 17+
    
    // Reglas de TypeScript
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // Reglas de Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Reglas de Prettier
    'prettier/prettier': 'warn',
    
    // Otras reglas
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
  },
}
