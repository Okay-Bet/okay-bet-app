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
    return <p>Loading...</p>;
  }

  return (
    <div>
      {username ? (
        <p>Welcome, {username}!</p>
      ) : (
        <button onClick={() => setIsModalOpen(true)}>Register Username</button>
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
