// src/components/RegisterUsernameModal.tsx
import { useState } from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

interface RegisterUsernameModalProps {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
}

const RegisterUsernameModal: React.FC<RegisterUsernameModalProps> = ({ open, onClose, walletAddress }) => {
  const [username, setUsername] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (username.includes('.')) {
      setMessage('Usernames cannot contain dots.');
      return;
    }
  
    try {
      const res = await fetch('/api/registerUsername', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, walletAddress }),
      });
  
      const data = await res.json();
  
      console.log('Response status:', res.status); // Log the response status
      console.log('Response data:', data); // Log the response data
  
      if (res.ok) {
        setMessage('Registration successful!');
        onClose();
      } else {
        setMessage(data.error || 'An error occurred during registration.');
      }
    } catch (error) {
      console.error('Error during registration:', error); // Log the caught error
      setMessage('An error occurred. Please try again.');
    }
  };
  

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <button type="submit">Register</button>
          {message && <p>{message}</p>}
        </form>
      </Box>
    </Modal>
  );
};

export default RegisterUsernameModal;
