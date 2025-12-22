/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_API_KEY?: string
  readonly VITE_ROOT_FOLDER_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface WindowEventMap {
  'beforeinstallprompt': BeforeInstallPromptEvent;
}
