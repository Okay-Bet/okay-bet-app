// components/CredentialsButton.tsx
import { useCredentials } from '@/hooks/useCredentials';
import { useActiveAccount } from 'thirdweb/react';

export const CredentialsButton = () => {
  const activeAccount = useActiveAccount();
  const { getCredentials, loading, credentials } = useCredentials();

  return (
    <div>
      <button 
        onClick={getCredentials}
        disabled={loading || !activeAccount}
      >
        {loading ? 'Getting Credentials...' : 'Get API Credentials'}
      </button>
      
      {credentials && (
        <pre className="mt-4 p-4 bg-slate-100 rounded overflow-x-auto">
          {JSON.stringify(credentials, null, 2)}
        </pre>
      )}
    </div>
  );
};