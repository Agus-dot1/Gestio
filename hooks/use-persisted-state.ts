'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface PersistedStateOptions<T> {
    serialize?: (val: T) => string;
    deserialize?: (val: string) => T;
}

/**
 * A hook that syncs state with localStorage.
 * Handles serialization, error catching, and type safety.
 */
export function usePersistedState<T>(
    key: string,
    initialValue: T,
    options?: PersistedStateOptions<T>
): [T, (value: T | ((curr: T) => T)) => void] {
    // Use a ref to store the initial value to avoid re-initializing on every render
    // if the initialValue is an object/array.
    const initialValueRef = useRef(initialValue);

    // Get from local storage then parse stored json or return initialValue
    const readValue = useCallback((): T => {
        // Prevent SSR errors
        if (typeof window === 'undefined') {
            return initialValueRef.current;
        }

        try {
            const item = window.localStorage.getItem(key);
            if (item === null) {
                return initialValueRef.current;
            }

            // Attempt to parse the stored value
            if (options?.deserialize) {
                return options.deserialize(item);
            }
            return JSON.parse(item) as T;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValueRef.current;
        }
    }, [key, options?.deserialize]);

    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState<T>(readValue);

    // Use a ref to store the current value for the stable setValue callback
    const storedValueRef = useRef(storedValue);
    useEffect(() => {
        storedValueRef.current = storedValue;
    }, [storedValue]);

    // Return a wrapped version of useState's setter function that
    // persists the new value to localStorage.
    const setValue = useCallback(
        (value: T | ((curr: T) => T)) => {
            try {
                // Allow value to be a function so we have same API as useState
                const valueToStore =
                    value instanceof Function ? value(storedValueRef.current) : value;

                // Save state
                setStoredValue(valueToStore);

                // Save to local storage
                if (typeof window !== 'undefined') {
                    const stringified = options?.serialize
                        ? options.serialize(valueToStore)
                        : JSON.stringify(valueToStore);
                    window.localStorage.setItem(key, stringified);
                    // Dispatch custom event for same-tab sync
                    window.dispatchEvent(new CustomEvent('local-storage-sync', {
                        detail: { key, newValue: stringified }
                    }));
                }
            } catch (error) {
                console.warn(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key, options?.serialize]
    );

    // Listen for changes from other tabs/windows (via 'storage') 
    // AND same-tab changes (via custom event)
    useEffect(() => {
        const handleSync = (event: any) => {
            // Check if it's a standard StorageEvent (cross-tab) or our custom event (same-tab)
            const isStorageEvent = event instanceof StorageEvent;
            const eventKey = isStorageEvent ? event.key : event.detail?.key;
            const newValue = isStorageEvent ? event.newValue : event.detail?.newValue;

            if (eventKey === key && newValue !== null) {
                try {
                    const parsed = options?.deserialize
                        ? options.deserialize(newValue)
                        : JSON.parse(newValue);
                    setStoredValue(parsed);
                } catch (error) {
                    console.warn(`Error parsing sync event for key "${key}":`, error);
                }
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', handleSync);
            window.addEventListener('local-storage-sync' as any, handleSync);
            return () => {
                window.removeEventListener('storage', handleSync);
                window.removeEventListener('local-storage-sync' as any, handleSync);
            };
        }
    }, [key, options?.deserialize]);

    return [storedValue, setValue];
}
