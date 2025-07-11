// Утилита для генерации fingerprint браузера для анонимных пользователей

interface FingerprintData {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  colorDepth: number;
  pixelRatio: number;
  hardwareConcurrency: number;
  maxTouchPoints: number;
}

async function generateFingerprint(): Promise<string> {
  const data: FingerprintData = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  };

  // Собираем данные в строку
  const fingerprintString = Object.values(data).join('|');
  
  // Создаем hash из собранных данных
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(fingerprintString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// Кэшируем fingerprint в localStorage
export async function getUserFingerprint(): Promise<string> {
  const cachedFingerprint = localStorage.getItem('userFingerprint');
  
  if (cachedFingerprint) {
    return cachedFingerprint;
  }
  
  const fingerprint = await generateFingerprint();
  localStorage.setItem('userFingerprint', fingerprint);
  
  return fingerprint;
}