// components/Common/AlertModal.js
import React from "react";

export default function AlertModal({ isOpen, message, onClose, onProceed, showProceed = false }) {
  if (!isOpen) return null;

  // Preserve existing behavior for falsy messages
  if (!message) return null;

  let displayMessage = message;

  // Only apply toString() if message is not already a string
  if (typeof message !== 'string') {
    console.warn('AlertModal received a non-string message. Converting to string.');
    displayMessage = String(message);
  }

  // Trim the message only if it's a string
  const trimmedMessage = typeof displayMessage === 'string' ? displayMessage.trim() : displayMessage;

  // Preserve existing behavior: don't render if trimmed message is empty
  if (trimmedMessage === "") return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-tertiary text-font p-8 sm:p-10 rounded-lg opacity-90 shadow-lg w-3/4 sm:w-1/2 lg:w-1/3">
        <p className="mb-4 font-heading text-center">{trimmedMessage}</p>
        <div className="flex justify-center space-x-4">
          <button
            className="py-2 px-4 bg-primary text-quaternary font-bold rounded hover:bg-secondary transition-colors"
            onClick={onClose}
          >
            {showProceed ? 'Nevermind, close' : 'Close'}
          </button>
          {showProceed && onProceed && (
            <button
              className="py-2 px-4 bg-primary text-quaternary font-bold rounded hover:bg-secondary transition-colors"
              onClick={onProceed}
            >
              Yes, proceed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}