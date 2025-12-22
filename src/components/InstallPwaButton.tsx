import { useEffect, useState } from 'react';

export default function InstallPwaButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-slow" style={{ width: 'max-content' }}>
            <button
                onClick={handleInstallClick}
                className="flex items-center gap-3 px-6 py-3
                     bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl
                     text-white transition-all duration-300 hover:bg-black/60 active:scale-95 group"
                style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1)'
                }}
            >
                <div className="flex items-center justify-center text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </div>

                <div className="text-left flex flex-col items-start">
                    <span className="font-semibold text-sm leading-none">Uygulamayı Yükle</span>
                </div>

                <div className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 ml-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </button>
        </div>
    );
}
