import {useState, useEffect} from 'react'

const LOCAL_STORAGE_PREFIX = "tz.";

const getKey = (key: string) => `${LOCAL_STORAGE_PREFIX}${key}`;

function useLocalStorageState<T = any>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState(() => {
    try {
      const localStorageValue = localStorage.getItem(getKey(key));
      if (localStorageValue !== null) {
        return JSON.parse(localStorageValue);
      }
    } catch (error) {
      console.error(`Error retrieving state from local storage: ${error}`);
    }
    return initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(getKey(key), JSON.stringify(state));
    } catch (error) {
      console.error(`Error storing state in local storage: ${error}`);
    }
  }, [key, state]);

  return [state, setState];
}


export default useLocalStorageState