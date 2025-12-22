import { useCallback, useRef, useState } from 'react';

type LongPressOptions = {
    shouldPreventDefault?: boolean;
    delay?: number;
};

export default function useLongPress(
    onLongPress: (event: React.TouchEvent | React.MouseEvent) => void,
    onClick?: () => void,
    { shouldPreventDefault = true, delay = 500 }: LongPressOptions = {}
) {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef<NodeJS.Timeout | null>(null);
    const target = useRef<EventTarget | null>(null);

    const start = useCallback(
        (event: React.TouchEvent | React.MouseEvent) => {
            if (shouldPreventDefault && event.target) {
                target.current = event.target;
            }
            timeout.current = setTimeout(() => {
                onLongPress(event);
                setLongPressTriggered(true);
                // Vibrate if supported
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                    navigator.vibrate(10);
                }
            }, delay);
        },
        [onLongPress, delay, shouldPreventDefault]
    );

    const clear = useCallback(
        (_: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
            if (shouldTriggerClick && !longPressTriggered && onClick) {
                onClick();
            }
            setLongPressTriggered(false);
            if (shouldPreventDefault && target.current) {
                target.current = null;
            }
        },
        [shouldPreventDefault, onClick, longPressTriggered]
    );

    return {
        onMouseDown: (e: React.MouseEvent) => start(e),
        onTouchStart: (e: React.TouchEvent) => start(e),
        onMouseUp: (e: React.MouseEvent) => clear(e),
        onMouseLeave: (e: React.MouseEvent) => clear(e, false),
        onTouchEnd: (e: React.TouchEvent) => clear(e),
    };
}
