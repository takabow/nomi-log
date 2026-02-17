import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r);
        },
        onRegisterError(error) {
            console.log('SW Registration Error:', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-bg-card/95 backdrop-blur-md border border-border shadow-lg rounded-xl p-4 flex flex-col gap-3 max-w-sm ml-auto">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="font-bold text-sm text-text-primary mb-1">
                            {offlineReady ? 'アプリの準備完了' : '新しいバージョンが利用可能です'}
                        </h3>
                        <p className="text-xs text-text-muted leading-relaxed">
                            {offlineReady
                                ? 'オフラインでも使用できるようになりました。'
                                : '更新するには「再読み込み」をタップしてください。'}
                        </p>
                    </div>
                    <button
                        onClick={close}
                        className="text-text-muted hover:text-text-primary transition-colors p-1"
                    >
                        <X size={16} />
                    </button>
                </div>
                {needRefresh && (
                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-primary text-text-primary font-bold text-sm rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <RefreshCw size={14} className="animate-spin-slow" />
                        再読み込みして更新
                    </button>
                )}
            </div>
        </div>
    );
}
