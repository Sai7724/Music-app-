import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import ReactDOM from 'react-dom/client';

import '@nuclearplayer/tailwind-config';
import '@nuclearplayer/themes';
import '@nuclearplayer/i18n';

import { initMobileApp } from './initMobileApp';

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Hide the splash after React mounts
const hideSplash = () => {
  void SplashScreen.hide({ fadeOutDuration: 300 });
};

// Set dark status bar on both platforms
const initStatusBar = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f0f10' });
  } catch {
    // Web preview — status bar API not available
  }
};

void initStatusBar();
void initMobileApp(root).then(hideSplash);
