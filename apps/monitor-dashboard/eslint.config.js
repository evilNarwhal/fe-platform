import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// ESLint Flat Config：
// - 统一约束 TS/TSX 代码风格与潜在问题
// - 集成 React Hooks 规则与 Vite 热更新规则
export default defineConfig([
  // 忽略构建产物
  globalIgnores(['dist']),
  {
    // 仅对 TypeScript 源码生效
    files: ['**/*.{ts,tsx}'],
    extends: [
      // JS 基础规则
      js.configs.recommended,
      // TypeScript 推荐规则
      tseslint.configs.recommended,
      // Hooks 依赖校验与调用顺序校验
      reactHooks.configs.flat.recommended,
      // React Fast Refresh 相关约束
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // 语法目标版本
      ecmaVersion: 2020,
      // 浏览器全局变量（window/document 等）
      globals: globals.browser,
    },
  },
])
