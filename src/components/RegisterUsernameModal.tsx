// src/components/RegisterUsernameModal.tsx
import { useState } from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";

const modalStyle = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
  borderRadius: 4,
};

interface RegisterUsernameModalProps {
  open: boolean;
  onClose: () => void;
  walletAddress: string;
}

const RegisterUsernameModal: React.FC<RegisterUsernameModalProps> = ({
  open,
  onClose,
  walletAddress,
}) => {
  const [username, setUsername] = useState<string>("");
  const [confirmUsername, setConfirmUsername] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.includes(".")) {
      setMessage("Usernames cannot contain dots.");
      return;
    }

    if (username !== confirmUsername) {
      setMessage("Usernames do not match.");
      return;
    }

    try {
      const res = await fetch("/api/registerUsername", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, walletAddress }),
      });

      const data = await res.json();

      console.log("Response status:", res.status); // Log the response status
      console.log("Response data:", data); // Log the response data

      if (res.ok) {
        setMessage("Registration successful!");
        onClose();
      } else {
        setMessage(data.error || "An error occurred during registration.");
      }
    } catch (error) {
      console.error("Error during registration:", error); // Log the caught error
      setMessage("An error occurred. Please try again.");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <h2 className="text-lg font-bold font-heading text-primary mb-4">
          Register Username
        </h2>
        <p className="mb-4 text-sm italic font-body ">
          Make it easier for people to make bets with you by creating a display name.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4 font-body">
            <label className="block mb-2">Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full p-2 border border-primary"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">Confirm Username:</label>
            <input
              type="text"
              value={confirmUsername}
              onChange={(e) => setConfirmUsername(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <button
            type="submit"
            className={`font-heading w-full p-4 bg-tertiary text-font  rounded-lg transition-colors
     hover:bg-quaternary hover:text-primary hover:italic`}
          >
            Register
          </button>
          {message && <p className="mt-4">{message}</p>}
        </form>
      </Box>
    </Modal>
  );
};

export default RegisterUsernameModal;
