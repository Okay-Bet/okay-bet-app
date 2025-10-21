"use client";

import React, { useState, useEffect } from "react";

export const WaitlistSection: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWaitlistCount();
  }, []);

  const fetchWaitlistCount = async () => {
    try {
      const response = await fetch("/api/waitlist");
      if (response.ok) {
        const data = await response.json();
        setWaitlistCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching waitlist count:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (email && !isLoading) {
      setIsLoading(true);
      try {
        const response = await fetch("/api/waitlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsSubmitted(true);
          setEmail("");
          setWaitlistCount(data.count || waitlistCount + 1);
          setTimeout(() => setIsSubmitted(false), 5000);
        } else {
          const data = await response.json();
          setError(data.error || "Failed to join waitlist");
        }
      } catch (error) {
        console.error("Error submitting email:", error);
        setError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-gray-100">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Join the Waitlist
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Get early access to new features and investment strategies
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent text-gray-900 placeholder-gray-400 text-sm sm:text-base"
              required
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-secondary hover:bg-accent-red-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] text-sm sm:text-base"
            >
              {isLoading ? "Joining..." : "Join"}
            </button>
          </div>

          {/* Feedback Messages */}
          {isSubmitted && (
            <p className="mt-4 text-green-600 text-center font-medium text-sm sm:text-base">
              You&apos;re on the list! We&apos;ll notify you when we launch.
            </p>
          )}
          {error && (
            <p className="mt-4 text-secondary text-center font-medium text-sm sm:text-base">
              {error}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Reach out to{" "}
          <a
            href="mailto:ben@spmc.dev"
            className="font-bold hover:text-gray-700"
          >
            ben@spmc.dev
          </a>{" "}
          for partnerships
        </p>
      </div>
    </div>
  );
};
