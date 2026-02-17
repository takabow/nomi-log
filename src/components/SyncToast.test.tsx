import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import SyncToast from './SyncToast';
import { SYNC_EVENT_NAME } from '../data/sync';

describe('SyncToast Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not render initially (idle)', () => {
        const { container } = render(<SyncToast />);
        expect(container.firstChild).toBeNull();
    });

    it('shows syncing state when event received', () => {
        render(<SyncToast />);

        act(() => {
            window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, {
                detail: { status: 'syncing' }
            }));
        });

        expect(screen.getByText('同期中...')).toBeInTheDocument();
    });

    it('shows success message and hides after timeout', () => {
        render(<SyncToast />);

        act(() => {
            window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, {
                detail: { status: 'success', message: '完了しました' }
            }));
        });

        expect(screen.getByText('完了しました')).toBeInTheDocument();

        // Fast-forward time to check auto-hide
        act(() => {
            vi.advanceTimersByTime(3500);
        });

        // Should be hidden (null)
        // Note: The component returns null when invisible and status idle.
        // But logic says: setVisible(false) after 3000ms, setStatus('idle') after 3300ms.
        // So after 3500ms it should be unmounted/null.

        // However, checking exact unmount might be tricky if state updates are pending.
        // Let's check queryByText.
        expect(screen.queryByText('完了しました')).not.toBeInTheDocument();
    });
});
