import { useState, useEffect } from 'react';

const CONFIG = {
  STORAGE_KEY: "discipline_tracker_v1",
};

export interface Failure {
  id: string;
  timestamp: number;
  mood: number; // 1-5
  note: string;
  triggers?: string[];
}

export function useFailures() {
  const [failures, setFailures] = useState<Failure[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (stored) {
      try {
        setFailures(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored failures", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(failures));
  }, [failures]);

  const addFailure = (failure: Omit<Failure, 'id' | 'timestamp'>) => {
    const newFailure: Failure = {
      ...failure,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    setFailures(prev => [...prev, newFailure]);
  };

  const clearFailures = () => {
    setFailures([]);
  };

  return { failures, addFailure, clearFailures, setFailures };
}
