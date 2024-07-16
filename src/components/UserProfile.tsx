// src/components/UserProfile.tsx
import { useState, useEffect } from 'react';
import { useCheckUsername } from '../hooks/useCheckUsername';
import RegisterUsernameModal from './RegisterUsernameModal';

interface UserProfileProps {
  walletAddress: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ walletAddress }) => {
  const { username, loading } = useCheckUsername(walletAddress);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  if (loading) {
    return <p></p>;
  }

  return (
    <div>
      {username ? (
        <p className='font-heading text-primary italic mb-2 text-left'>Welcome, {username}</p>
      ) : (
        <button onClick={() => setIsModalOpen(true)} className='font-heading w-half p-2 bg-tertiary text-font  rounded-lg transition-colors
     hover:bg-quaternary hover:text-primary hover:italic'>Register Username</button>
      )}
      <RegisterUsernameModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        walletAddress={walletAddress}
      />
    </div>
  );
};

export default UserProfile;
