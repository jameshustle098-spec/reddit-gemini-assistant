import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the root directory
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true
    },
    server: {
      port: 5173,
      strictPort: true
    }
  };
});
