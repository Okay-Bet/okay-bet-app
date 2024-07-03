import React, { useState } from 'react';
import { fetchWalletMetadata } from '../utils/fetchWalletMetadata';

const WalletLookup: React.FC = () => {
  const [inputType, setInputType] = useState<'email' | 'phone'>('email');
  const [inputValue, setInputValue] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setWalletAddress('');

    try {
      const metadata = await fetchWalletMetadata({ queryBy: inputType, value: inputValue });
      if (metadata.length > 0) {
        setWalletAddress(metadata[0].walletAddress);
      } else {
        setError('No wallet found for this input');
      }
    } catch (err) {
      setError('Failed to fetch wallet address');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4">Wallet Address Lookup</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2">
            <input
              type="radio"
              value="email"
              checked={inputType === 'email'}
              onChange={() => setInputType('email')}
              className="mr-2"
            />
            Email
          </label>
          <label className="block">
            <input
              type="radio"
              value="phone"
              checked={inputType === 'phone'}
              onChange={() => setInputType('phone')}
              className="mr-2"
            />
            Phone
          </label>
        </div>
        <input
          type={inputType === 'email' ? 'email' : 'tel'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={inputType === 'email' ? 'Enter email' : 'Enter phone number'}
          className="w-full px-3 py-2 border rounded-md mb-4"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Lookup Wallet'}
        </button>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {walletAddress && (
        <div className="mt-4">
          <h3 className="font-bold">Wallet Address:</h3>
          <p className="break-all">{walletAddress}</p>
        </div>
      )}
    </div>
  );
};

export default WalletLookup;