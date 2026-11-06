import { defineConfig, loadEnv } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig(({ command, mode }) => {
  const backendUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_BACKEND_URL
    || (command === 'serve' ? 'http://localhost:4000' : undefined);

  // Falling back here would ship a build that can't reach the backend
  if (!backendUrl) {
    throw new Error('Set VITE_BACKEND_URL to build the extension. See .env.example.');
  }

  return {
    define: { 'import.meta.env.VITE_BACKEND_URL': JSON.stringify(backendUrl) },
    plugins: [crx({
      manifest: { ...manifest, host_permissions: [`${new URL(backendUrl).origin}/*`] }
    })],
  };
});
