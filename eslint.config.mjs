import globals from 'globals'
import pluginReact from 'eslint-plugin-react'

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ['**/*.{js,mjs,cjs,jsx}'] },
    { languageOptions: { globals: globals.node } },
    { languageOptions: { globals: globals.jest } },
    pluginReact.configs.flat.recommended,
]
