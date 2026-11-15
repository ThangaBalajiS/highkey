import { defineConfig, loadEnv } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

// The Web Store listing's public key. Unpacked dev builds carry it so they get the
// listing's ID, menkgmpdjcoogmhpfdodaiddbgjeepie, which the Google OAuth client is
// registered to; without it Chrome picks a random ID and sign-in fails with
// "bad client id". The store sets the ID itself, so uploads leave it out.
const STORE_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkaBwHoptgDe3veRpuIKbK/QRESNwi00H8pUof+s0VG7W1iy3+FFPhqKiJ7oCp10EP0RMs4YzFO1tSFXdOkLiciXqKCC7J0ykmfeZ6SzBXMs1PLm7wRbYILqa8HEnwETaHvhUmey8tJSajie+ow3pX0KbymG/RCXhCFD0pKZSDUbAa7sgkjTPu7ovPs9bexJHunnpyzlvKllAEPnlpSev9Gogb91b3CTFwcEvvEGuERm/SxP7sskDexmVMIv6AyZJMGB3tsqjX9JJ31XPZUuI968TyYi7P0alZ0Tdxz9YS/AVyD0xPFjg8yboqZBJ2eNluNDQkML2BMYHDIG0o11CsQIDAQAB';

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
      manifest: {
        ...manifest,
        ...(command === 'serve' && { key: STORE_PUBLIC_KEY }),
        host_permissions: [`${new URL(backendUrl).origin}/*`]
      }
    })],
  };
});
