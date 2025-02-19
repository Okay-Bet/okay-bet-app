// components/Landing/Pitch.tsx
// Content for landing page explaining wtf we do

import React from "react";
import FAQ from "./FAQ";
import Testimonials from "./Testimonials";
import {
  Hub,
  PersonAddAlt1,
  Casino,
  SvgIconComponent,
} from "@mui/icons-material";

interface FeatureCardProps {
  Icon: SvgIconComponent;
  title: string;
  description: string;
}

const FeatureCard = ({ Icon, title, description }: FeatureCardProps) => (
  <div className="relative group">
    <div
      className="absolute inset-0 bg-gradient-aggressive from-white/20 to-white/5 opacity-0 
                    group-hover:opacity-100 blur-lg transition-all duration-300"
    />
    <div
      className="relative p-8 rounded-lg border border-white/20 bg-white/10
                    transform transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-aggressive"
    >
      <div className="flex flex-col items-center text-center">
        <div className="bg-white/10 rounded-full p-4 mb-6">
          <Icon sx={{ fontSize: 48 }} className="text-white" />
        </div>
        <h3 className="text-2xl font-header text-white mb-3">{title}</h3>
        <p className="text-white/90 text-lg leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

const Pitch = () => {
  const liveFeature: FeatureCardProps = {
    Icon: Hub,
    title: "Aggregation",
    description: "Find arbitrage opportunities between prices and rules.",
  };

  const comingFeatures: FeatureCardProps[] = [
    {
      Icon: PersonAddAlt1,
      title: "Reputation",
      description:
        "Connect your socials and build your credibility as we expand to more prediction markets.",
    },
    {
      Icon: Casino,
      title: "Leverage",
      description:
        "Parlay any uncorrelated markets together for much higher payouts.",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <section className="relative overflow-hidden">
        {/* Enhanced Red Background with Gradients */}
        <div className="absolute inset-0">
          {/* Base red color */}
          <div className="absolute inset-0 bg-secondary" />

          {/* Darker gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/20" />

          {/* Accent gradient streaks */}
          <div className="absolute inset-0">
            <div
              className="absolute top-0 left-0 w-full h-full 
                           bg-gradient-to-br from-accent-red-600/30 via-transparent to-transparent"
            />
            <div
              className="absolute bottom-0 right-0 w-full h-full 
                           bg-gradient-to-tl from-black/20 via-transparent to-transparent"
            />
          </div>

          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_1px,transparent_1px)] 
                         bg-[size:40px_40px] opacity-50"
          />
        </div>

        <div className="relative px-8 py-24">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <h1
              className="text-6xl md:text-7xl font-heading text-white tracking-tighter italic mb-6 
                          text-shadow-aggressive"
            >
              BET BETTER
            </h1>

            <p className="text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed font-bold">
              Okay Bet is the application layer of prediction markets
            </p>

            {/* Live Feature Section */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-20">
              <div className="md:w-1/2 text-left">
                <h2 className="text-4xl font-heading text-white mb-6">
                  Aggregation is <span className="italic font-bold">Live</span>
                </h2>
                <p className="text-xl text-white/90 leading-relaxed">
                  Compare prices, rules, and liquidity between prediction
                  markets on Limitless and Polymarket. Open trades directly
                  through our app.
                </p>
              </div>
              <div className="md:w-1/2">
                <FeatureCard {...liveFeature} />
              </div>
            </div>

            {/* Coming Soon Section */}
            <h2 className="text-4xl font-heading text-white mb-8">
              Coming Soon
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {comingFeatures.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </div>
        </div>
      </section>
      <FAQ />
      <Testimonials />
    </div>
  );
};

export default Pitch;
