
import React, { useState, useEffect } from 'react';

function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    // This effect is to sync state across tabs, but for this simple app it's not strictly necessary.
    // It's good practice for more complex scenarios.
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        try {
          setStoredValue(event.newValue ? JSON.parse(event.newValue) : initialValue);
        } catch (error) {
            console.error(error)
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
