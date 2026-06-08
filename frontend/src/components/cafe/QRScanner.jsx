import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertTriangle, Loader2 } from 'lucide-react';

const FACING_ENV = 'facing:environment';
const FACING_USER = 'facing:user';

const isMobileDevice = () =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

const toCameraInput = (cameraId) => {
  if (cameraId === FACING_ENV) return { facingMode: 'environment' };
  if (cameraId === FACING_USER) return { facingMode: 'user' };
  return cameraId;
};

/**
 * html5-qrcode camera viewfinder for cafe desk scanning.
 */
const QRScanner = ({ onScan, scanPaused = false }) => {
  const { t } = useTranslation();
  const reactId = useId().replace(/:/g, '');

  const getInsecureContextMessage = useCallback(() => {
    const host = window.location.hostname || 'your-computer-ip';
    const port = window.location.port || '5173';
    return t('cafe.httpsRequired', { host, port });
  }, [t]);
  const scannerId = `qr-reader-${reactId}`;

  const [scannerState, setScannerState] = useState('IDLE');
  const [scannerError, setScannerError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const html5QrCodeRef = useRef(null);
  const scanLockRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopScanner = useCallback(async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) return;
    html5QrCodeRef.current = null;
    try {
      const state = scanner.getState();
      if (state === 2 || state === 3) await scanner.stop();
    } catch (e) {
      console.warn('Scanner stop warning:', e);
    }
    try {
      await scanner.clear();
    } catch (e) {
      console.warn('Scanner clear warning:', e);
    }
  }, []);

  const startScanner = useCallback(
    async (cameraId) => {
      if (!cameraId || scanPaused) return;

      await stopScanner();
      scanLockRef.current = false;

      const el = document.getElementById(scannerId);
      if (!el) return;
      el.innerHTML = '';

      try {
        setScannerState('STARTING');
        setScannerError(null);

        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          toCameraInput(cameraId),
          {
            fps: 15,
            qrbox: (w, h) => {
              const size = Math.min(w, h) * 0.7;
              return { width: Math.floor(size), height: Math.floor(size) };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (scanLockRef.current || scanPaused) return;
            scanLockRef.current = true;
            try {
              html5QrCode.pause(true);
            } catch (e) {
              console.warn('Pause failed:', e);
            }
            setScannerState('PAUSED');
            onScanRef.current?.(decodedText.trim());
          },
          () => {}
        );

        setScannerState('SCANNING');
      } catch (err) {
        console.error('Scanner start error:', err);
        const failed = html5QrCodeRef.current;
        html5QrCodeRef.current = null;
        if (failed) {
          try {
            const state = failed.getState();
            if (state === 2 || state === 3) await failed.stop();
          } catch (e) {
            console.warn(e);
          }
          try {
            await failed.clear();
          } catch (e) {
            console.warn(e);
          }
        }
        const mount = document.getElementById(scannerId);
        if (mount) mount.innerHTML = '';
        setScannerError(
          err?.message || t('cafe.cameraStartFailed')
        );
        setScannerState('ERROR');
      }
    },
    [scanPaused, scannerId, stopScanner, t]
  );

  const handleRetryConnection = useCallback(async () => {
    if (!window.isSecureContext) {
      setScannerError(getInsecureContextMessage());
      setScannerState('ERROR');
      return;
    }

    let cameraId = selectedCameraId;
    if (!cameraId && isMobileDevice()) {
      cameraId = FACING_ENV;
      setSelectedCameraId(cameraId);
    }
    if (!cameraId) {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices?.length) {
          setScannerError(t('cafe.noCamera'));
          setScannerState('ERROR');
          return;
        }
        setCameras(devices);
        const backCam = devices.find((d) =>
          /back|rear|environment/i.test(d.label)
        );
        cameraId = backCam ? backCam.id : devices[0].id;
        setSelectedCameraId(cameraId);
      } catch {
        setScannerError(t('cafe.cameraDenied'));
        setScannerState('ERROR');
        return;
      }
    }
    await startScanner(cameraId);
  }, [selectedCameraId, startScanner, t]);

  const resumeScanning = useCallback(async () => {
    scanLockRef.current = false;
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.getState() === 3) {
          html5QrCodeRef.current.resume();
          setScannerState('SCANNING');
          return;
        }
      } catch (e) {
        console.warn('Resume failed:', e);
      }
    }
    if (selectedCameraId) await startScanner(selectedCameraId);
  }, [selectedCameraId, startScanner]);

  useEffect(() => {
    if (!window.isSecureContext) {
      setScannerError(getInsecureContextMessage());
      setScannerState('ERROR');
      return () => stopScanner();
    }
    if (isMobileDevice()) {
      setSelectedCameraId(FACING_ENV);
      return () => stopScanner();
    }
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices?.length) {
          setCameras(devices);
          const backCam = devices.find((d) =>
            /back|rear|environment/i.test(d.label)
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setScannerError(t('cafe.noCamera'));
          setScannerState('ERROR');
        }
      })
      .catch(() => {
        setScannerError(t('cafe.cameraDenied'));
        setScannerState('ERROR');
      });
    return () => stopScanner();
  }, [stopScanner, t, getInsecureContextMessage]);

  useEffect(() => {
    if (selectedCameraId && scannerState === 'IDLE' && !scanPaused) {
      startScanner(selectedCameraId);
    }
  }, [selectedCameraId, scannerState, scanPaused, startScanner]);

  useEffect(() => {
    if (!scanPaused && scannerState === 'PAUSED') {
      resumeScanning();
    }
  }, [scanPaused, scannerState, resumeScanning]);

  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
        <Camera className="w-4 h-4 text-brand-500" />
        <span>{t('cafe.cameraTerminal')}</span>
      </h3>

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-950 border border-slate-800/80">
        <div id={scannerId} className="w-full h-full" style={{ minHeight: 280 }} />

        {scannerState === 'SCANNING' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-4 w-8 h-8 border-t-[3px] border-l-[3px] border-brand-500 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-[3px] border-r-[3px] border-brand-500 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-[3px] border-l-[3px] border-brand-500 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-[3px] border-r-[3px] border-brand-500 rounded-br-lg" />
            <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scan" />
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-brand-400 tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('cafe.scanning')}</span>
            </div>
          </div>
        )}

        {scannerState === 'STARTING' && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">
              {t('cafe.initializingCamera')}
            </span>
          </div>
        )}

        {scannerState === 'ERROR' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 gap-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-400">{t('cafe.scannerOffline')}</h4>
              <p className="text-xs text-slate-400 max-w-[240px] mt-1 mx-auto">
                {scannerError}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetryConnection}
              disabled={scannerState === 'STARTING'}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {scanPaused && scannerState !== 'ERROR' && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        )}
      </div>

      {cameras.length > 1 && (
        <select
          value={selectedCameraId}
          onChange={(e) => {
            setSelectedCameraId(e.target.value);
            setScannerState('IDLE');
          }}
          className="glass-input text-xs py-2 cursor-pointer"
        >
          {cameras.map((cam) => (
            <option key={cam.id} value={cam.id} className="bg-slate-900">
              {cam.label || `Camera ${cam.id.substring(0, 8)}`}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default QRScanner;
