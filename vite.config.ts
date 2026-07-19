import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Note: The Gemini API key is used ONLY on the server (see server/config.ts).
// It is intentionally NOT injected into the client bundle for security.
export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
