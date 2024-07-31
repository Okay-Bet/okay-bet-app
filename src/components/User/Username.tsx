import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useActiveAccount } from 'thirdweb/react';
import UsernameRegistryABI from '@/constants/UsernameRegistryABI.json';
import AlertModal from '@/components/Common/AlertModal';

const UsernameRegistryAddress = "0x93e7E62ffEBc3FD586EEf177Fc094225868c7Df4";

const Username = () => {
  const account = useActiveAccount();
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const checkUsername = useCallback(async () => {
    if (!account) return;
    setIsChecking(true);
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(UsernameRegistryAddress, UsernameRegistryABI, provider);
    try {
      const existingUsername = await contract.getUsernameByAddress(account.address);
      if (existingUsername) {
        setCurrentUsername(existingUsername);
      } else {
        setCurrentUsername('');
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setCurrentUsername('');
    } finally {
      setIsChecking(false);
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      checkUsername();
    } else {
      setCurrentUsername('');
      setIsChecking(false);
    }
  }, [account, checkUsername]);

  const isValidUsername = (input: string) => {
    return /^[a-z0-9]{1,24}$/.test(input);
  };

  const handleRegisterClick = () => {
    if (isValidUsername(username)) {
      setAlertMessage(`Do you really want "${username}" to be your name?`);
      setAlertOpen(true);
    } else {
      setFeedback('Invalid username. Use only lowercase letters and numbers, up to 24 characters.');
    }
  };

  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  const registerUsername = async () => {
    setAlertOpen(false);
    setIsRegistering(true);
    setFeedback('');
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(UsernameRegistryAddress, UsernameRegistryABI, signer);
      const tx = await contract.registerUsername(username.toLowerCase());
      await tx.wait();
      setFeedback('Username registered successfully!');
      setCurrentUsername(username.toLowerCase());
      setUsername('');
      setShowForm(false);
    } catch (error) {
      console.error("Error registering username:", error);
      setFeedback('Error registering username. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  const toggleForm = () => {
    setShowForm(!showForm);
    if (showForm) {
      setUsername('');
      setFeedback('');
    }
  };

  if (!account) return null;
  if (isChecking) return <div className="text-center text-primary">Checking username...</div>;
  if (currentUsername) return <div className="text-center text-xl font-heading font-italic text-primary">Betting as <span className='italic'>{currentUsername} </span> </div>;

  return (
    <div className="max-w-md mx-auto p-6 mb-2">
      <button
        onClick={toggleForm}
        className="w-full py-2 px-4 font-bold text-font bg-secondary hover:italic focus:outline-none focus:ring-2 focus:ring-tertiary focus:ring-opacity-80"
      >
        {showForm ? 'Set Username' : 'Set Username'}
      </button>

      {showForm && (
        <div className="mt-4">
          <p className="mb-4 text-primary">
            Choose a unique username to identify yourself to others. 
            Usernames are permanently linked to your account.
            <span className='font-bold'> You can&apos;t change it later!</span>
          </p>
          <div className="mb-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Enter username"
              disabled={isRegistering}
              maxLength={24}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tertiary"
            />
            <p className="mt-1 text-sm text-primary">
              Use only lowercase letters and numbers.
            </p>
          </div>
          <button 
            onClick={handleRegisterClick} 
            disabled={isRegistering || !username || !isValidUsername(username)}
            className={`w-full py-2 px-4 rounded-md text-white font-semibold
              ${isRegistering || !username || !isValidUsername(username)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-secondary hover:bg-tertiary hover:italic focus:outline-none focus:ring-2 focus:ring-tertiary focus:ring-opacity-50'
              }`}
          >
            {isRegistering ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registering...
              </span>
            ) : 'Register'}
          </button>
          {feedback && (
            <p className={`mt-4 text-center ${feedback.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {feedback}
            </p>
          )}
        </div>
      )}

      <AlertModal
        isOpen={alertOpen}
        message={alertMessage}
        onClose={handleAlertClose}
        onProceed={registerUsername}
        showProceed={true}
      />
    </div>
  );
};

export default Username;