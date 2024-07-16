// src/hooks/useCheckUsername.ts
import { useEffect, useState } from 'react';

export const useCheckUsername = (walletAddress: string) => {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const response = await fetch(`/api/resolve?walletAddress=${walletAddress}`);
        if (response.ok) {
          const data = await response.json();
          setUsername(data.username);
        } else {
          setUsername(null);
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      } finally {
        setLoading(false);
      }
    };

    if (walletAddress) {
      fetchUsername();
    }
  }, [walletAddress]);

  return { username, loading };
};
