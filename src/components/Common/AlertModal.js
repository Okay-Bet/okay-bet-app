import React from "react";

export default function AlertModal({
  isOpen,
  message,
  onClose,
  onProceed,
  showProceed = false,
}) {
  if (!isOpen) return null;

  let displayMessage = message;
  // Handle boolean messages
  if (typeof message === "boolean") {
    console.warn(
      "AlertModal received a boolean message. Using default message."
    );
    displayMessage = message ? "Operation successful" : "Operation failed";
  } else if (typeof message !== "string") {
    console.warn(
      "AlertModal received a non-string message. Converting to string."
    );
    displayMessage = String(message);
  }

  const trimmedMessage =
    typeof displayMessage === "string" ? displayMessage.trim() : displayMessage;
  if (!trimmedMessage) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[9999]">
      <div className="bg-tertiary text-font p-8 sm:p-10 rounded-lg opacity-90 shadow-lg w-3/4 sm:w-1/2 lg:w-1/3">
        <p className="mb-4 font-heading text-center">{trimmedMessage}</p>
        <div className="flex justify-center space-x-4">
          <button
            className="py-2 px-4 bg-primary text-quaternary font-bold rounded hover:bg-secondary transition-colors"
            onClick={onClose}
          >
            {showProceed ? "Nevermind, close" : "Close"}
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
