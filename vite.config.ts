import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 配置：React 插件、相对路径打包、ES 模块 Worker
export default defineConfig({
  plugins: [react()],
  base: './',
  worker: {
    format: 'es',
  },
});
