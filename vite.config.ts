import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Note: The Gemini API key is used ONLY on the server (see server/config.ts).
// It is intentionally NOT injected into the client bundle for security.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default defineConfig(() => {
  return {
    server: {
      host: '0.0.0.0',
      fs: {
        ignore: ['extension/**'],
      } as any,
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor';
            if (id.includes('node_modules/lucide-react')) return 'icons-vendor';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
