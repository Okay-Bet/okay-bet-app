// components/AlertModal.js
import React from "react";

export default function AlertModal({ isOpen, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex  justify-center items-center">
      <div className="bg-tertiary text-font p-8 sm:p-10 rounded-lg opacity-90 shadow-lg w-3/4 sm:w-1/2 lg:w-1/3">
        <p className="mb-4 font-heading text-center">{message}</p>
        <div className="flex justify-center">
          <button
            className="py-2 px-4 bg-primary text-quaternary font-bold rounded hover:bg-secondary transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
