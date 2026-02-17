import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { SYNC_EVENT_NAME } from '../data/sync';
import type { SyncStatus } from '../data/sync';

export default function SyncToast() {
    const [status, setStatus] = useState<SyncStatus>('idle');
    const [message, setMessage] = useState<string>('');
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleSyncStatus = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const newStatus = detail.status as SyncStatus;
            console.log('[nomi-log] SyncToast received:', newStatus, detail.message);

            setStatus(newStatus);
            if (detail.message) setMessage(detail.message);

            if (newStatus === 'syncing') {
                setVisible(true);
            } else if (newStatus === 'success' || newStatus === 'error') {
                setVisible(true);
                // Hide after 3 seconds
                setTimeout(() => {
                    setVisible(false);
                    // Reset to idle after fade out
                    setTimeout(() => setStatus('idle'), 300);
                }, 3000);
            } else if (newStatus === 'update_required') {
                setVisible(true);
                // Keep visible longer or until next action? 
                // For now, behave like error but longer
                setTimeout(() => {
                    setVisible(false);
                    setTimeout(() => setStatus('idle'), 300);
                }, 5000);
            } else {
                setVisible(false);
            }
        };

        window.addEventListener(SYNC_EVENT_NAME, handleSyncStatus);
        return () => window.removeEventListener(SYNC_EVENT_NAME, handleSyncStatus);
    }, []);

    if (!visible && status === 'idle') return null;

    return (
        <div
            className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 transform ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
                }`}
        >
            <div className={`
                flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl backdrop-blur-md border text-sm font-bold tracking-wide
                ${status === 'syncing' ? 'bg-bg-surface/95 border-primary text-primary' : ''}
                ${status === 'success' ? 'bg-accent-teal/10 border-accent-teal text-accent-teal' : ''}
                ${status === 'error' ? 'bg-danger/10 border-danger text-danger' : ''}
                ${status === 'update_required' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : ''}
            `}>
                {status === 'syncing' && <Loader2 size={14} className="animate-spin" />}
                {status === 'success' && <CheckCircle2 size={14} />}
                {status === 'error' && <AlertCircle size={14} />}
                {status === 'update_required' && <AlertCircle size={14} />}

                <span>
                    {status === 'syncing' ? '同期中...' : message}
                </span>
            </div>
        </div>
    );
}
