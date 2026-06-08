import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.join(__dirname, '.certs');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');
const hasMkcertCerts = fs.existsSync(keyPath) && fs.existsSync(certPath);

function readBackendPort() {
  const envPath = path.join(__dirname, '../backend/.env');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^PORT=(\d+)\s*$/m);
    if (match) return match[1];
  } catch {
    // backend/.env may be missing in some setups
  }
  return process.env.PORT || '5000';
}

const backendPort = readBackendPort();
const backendTarget = `http://127.0.0.1:${backendPort}`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ...(hasMkcertCerts ? [] : [basicSsl()])],
  server: {
    port: 5173,
    host: true,
    https: hasMkcertCerts
      ? {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }
      : true,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});
