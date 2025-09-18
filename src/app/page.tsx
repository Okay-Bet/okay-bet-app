"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Logo from "@/components/Logo/Logo";

export default function Home() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchWaitlistCount();
  }, []);

  const fetchWaitlistCount = async () => {
    try {
      const response = await fetch('/api/waitlist');
      if (response.ok) {
        const data = await response.json();
        setWaitlistCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching waitlist count:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && !isLoading) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsSubmitted(true);
          setEmail("");
          setWaitlistCount(data.count || waitlistCount + 1);
          setTimeout(() => setIsSubmitted(false), 3000);
        } else {
          console.error('Failed to submit email');
        }
      } catch (error) {
        console.error('Error submitting email:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-5xl w-full text-center relative z-10">
        <div className="mb-8">
          <Logo />
        </div>
        
        <div className="mb-6 inline-flex items-center px-5 py-2 bg-white/90 backdrop-blur-sm border border-accent-gray-200 rounded-full shadow-sharp">
          <span className="w-2 h-2 bg-accent-red-500 rounded-full animate-pulse mr-3"></span>
          <span className="text-sm font-body font-medium text-accent-gray-700">Coming Soon</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-heading mb-4 text-primary leading-none">
          Apps on 
          <span className="block gradient-text mt-2">
            Prediction Markets
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl font-body text-accent-gray-700 mb-12 max-w-3xl mx-auto font-medium">
          Markets are infrastructure, we are building products on the prediction market layer to drive more liquidity and make forecasts better. 
        </p>
        
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto mb-8">
          <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-aggressive border border-accent-gray-200">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email for early access"
              className="flex-1 px-6 py-4 bg-transparent text-primary placeholder-accent-gray-400 focus:outline-none font-body"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary font-header text-lg tracking-wide min-w-[150px] disabled:opacity-50"
            >
              {isLoading ? 'JOINING...' : 'JOIN WAITLIST'}
            </button>
          </div>
          {isSubmitted && (
            <p className="mt-4 text-accent-red-500 font-body font-semibold animate-pulse">
              You&apos;re on the list! We&apos;ll notify you when we launch.
            </p>
          )}
        </form>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mt-16">
          <a 
            href="https://github.com/theSchein/pamela" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-accent-gray-200 shadow-sharp hover:shadow-aggressive transition-shadow block"
          >
            <div className="w-12 h-12 mx-auto mb-4 relative overflow-hidden rounded-lg">
              <Image 
                src="/pamela.jpg" 
                alt="AI Agents" 
                width={48} 
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            <h3 className="font-header text-lg text-primary mb-2">AI Agents</h3>
            <p className="text-accent-gray-600 font-body text-sm">Invest in agents that trade faster and sharper</p>
          </a>
          
          <a 
            href="https://www.spmc.dev/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-accent-gray-200 shadow-sharp hover:shadow-aggressive transition-shadow block"
          >
            <div className="w-12 h-12 mx-auto mb-4 relative overflow-hidden rounded-lg">
              <Image 
                src="/spmc.png" 
                alt="Aggregation" 
                width={48} 
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            <h3 className="font-header text-lg text-primary mb-2">Aggregation</h3>
            <p className="text-accent-gray-600 font-body text-sm">A single touchpoint to trade all prediction markets</p>
          </a>
          
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-accent-gray-200 shadow-sharp hover:shadow-aggressive transition-shadow">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-aggressive from-neon-pink to-accent-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-header text-lg text-primary mb-2">Parlays</h3>
            <p className="text-accent-gray-600 font-body text-sm">Leverage multiple event outcomes for higher payouts</p>
          </div>
        </div>
      </div>
    </main>
  );
}