import { useEffect, useCallback, useReducer } from 'react';
import * as SecureStore from 'expo-secure-store';

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(initialValue: [boolean, T | null] = [true, null]): UseStateHook<T> {
  return useReducer(
    (state: [boolean, T | null], action: T | null = null): [boolean, T | null] => [false, action],
    initialValue
  ) as UseStateHook<T>;
}

export async function setStorageItemAsync<T>(key: string, value: T | null) {
  if (value == null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  }
}

export function useStorageState<T = string | null | undefined>(key: string): UseStateHook<T> {
  // Public
  const [state, setState] = useAsyncState<T>();

  // Get
  useEffect(() => {
    SecureStore.getItemAsync(key).then((value: string | null) => {
      if (value) {
        try {
          setState(JSON.parse(value) as T);
        } catch {
          setState(value as T);
        }
      } else {
        setState(null);
      }
    });
  }, [key]);

  // Set
  const setValue = useCallback(
    (value: T | null) => {
      setState(value);
      setStorageItemAsync(key, value);
    },
    [key]
  );

  return [state, setValue];
}
