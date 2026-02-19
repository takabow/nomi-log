import { useState, useEffect } from 'react';

export function useDateWithOffset(offsetHour = 3) {
    const [dateState, setDateState] = useState(() => calculateDateState(offsetHour));

    useEffect(() => {
        const checkDate = () => {
            const newState = calculateDateState(offsetHour);
            // Compare primitive values to avoid unnecessary re-renders
            setDateState(prev => {
                if (
                    prev.dateStr !== newState.dateStr ||
                    prev.isLateNight !== newState.isLateNight
                ) {
                    return newState;
                }
                return prev;
            });
        };

        const intervalId = setInterval(checkDate, 60000); // Check every minute

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkDate();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial check on mount/focus isn't strictly necessary with useState initializer,
        // but good for ensuring freshness if component was suspended.
        checkDate();

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [offsetHour]);

    return dateState;
}

function calculateDateState(offsetHour: number) {
    const now = new Date();
    const currentHour = now.getHours();

    // If current time is e.g. 02:30, it's considered late night of the previous day
    const isLateNight = currentHour < offsetHour;

    // Logical date: subtract 1 day if late night
    const logicalDate = new Date(now);
    if (isLateNight) {
        logicalDate.setDate(logicalDate.getDate() - 1);
    }

    const year = logicalDate.getFullYear();
    const month = logicalDate.getMonth() + 1;
    const day = logicalDate.getDate();

    // YYYY-MM-DD (local)
    const dateStr = `${year} -${String(month).padStart(2, '0')} -${String(day).padStart(2, '0')} `;

    // e.g. "2/19"
    const displayDate = `${month}/${day}`;

    return { dateStr, isLateNight, displayDate };
}
