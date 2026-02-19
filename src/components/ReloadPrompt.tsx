import { useRegisterSW } from 'virtual:pwa-register/react';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function ReloadPrompt() {
    const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r);
            if (r) registrationRef.current = r;
        },
        onRegisterError(error) {
            console.log('SW Registration Error:', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    // Check for updates on visibility change (app switch) or focus
    useEffect(() => {
        const update = () => {
            if (document.visibilityState === 'visible' && registrationRef.current) {
                console.log('Checking for SW update...');
                registrationRef.current.update().catch(err => console.error('SW update check failed:', err));
            }
        };

        document.addEventListener('visibilitychange', update);
        window.addEventListener('focus', update);

        // Check immediately on mount
        update();

        return () => {
            document.removeEventListener('visibilitychange', update);
            window.removeEventListener('focus', update);
        };
    }, []);

    // Auto-update when new version is available
    useEffect(() => {
        if (needRefresh) {
            console.log('New content available, auto-updating...');
            updateServiceWorker(true);
        }
    }, [needRefresh, updateServiceWorker]);

    // If auto-updating, we might not need to render the prompt, but keeping it as fallback or visual feedback is fine.
    // However, if we auto-update, the page will reload quickly.
    // Let's keep showing the prompt only if offlineReady is true (for first offline cache).

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-bg-card/95 backdrop-blur-md border border-border shadow-lg rounded-xl p-4 flex flex-col gap-3 max-w-sm ml-auto">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="font-bold text-sm text-text-primary mb-1">
                            {needRefresh ? '更新しています...' : 'アプリの準備完了'}
                        </h3>
                        <p className="text-xs text-text-muted leading-relaxed">
                            {needRefresh
                                ? '最新バージョンを適用中です。'
                                : 'オフラインでも使用できるようになりました。'}
                        </p>
                    </div>
                    <button
                        onClick={close}
                        className="text-text-muted hover:text-text-primary transition-colors p-1"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
