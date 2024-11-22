import React from "react";
import FAQ from "./FAQ";
import Testimonials from "./Testimonials";
import { Hub, PersonAddAlt1, Casino } from "@mui/icons-material";

const FeatureCard = ({ Icon, title, description }) => (
  <div className="flex flex-col items-center text-center px-6 flex-1">
    <div className="bg-quaternary/10 rounded-full p-6 mb-4">
      <Icon sx={{ fontSize: 48 }} className="text-quaternary" />
    </div>
    <h3 className="text-xl font-bold text-font mb-2">{title}</h3>
    <p className="text-font text-lg">{description}</p>
  </div>
);

const Pitch = () => {
  const features = [
    {
      Icon: Hub,
      title: "Aggregation",
      description: "Compare prices, rules, and volume between similar prediction markets on any chain.",
    },
    {
      Icon: PersonAddAlt1,
      title: "Reputation",
      description: "Connect your socials and build your prediction credibility. Get your followers to invest in you and your predictions.",
    },
    {
      Icon: Casino,
      title: "Leverage",
      description: "Parlay any unrelated markets together for much higher payouts.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <section className="flex flex-col items-center bg-secondary py-16 px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-heading text-quaternary tracking-tighter italic mb-6">
          BET BETTER
        </h1>
        <p className="text-xl text-quaternary mb-12 max-w-2xl">
          Manage positions on any prediction market on any chain from Okay Bet.
        </p>
        <h2 className="text-3xl md:text-4xl font-heading text-font tracking-tighter italic mb-16">
          COMING SOON
        </h2>

        <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </section>
      <FAQ />
      <Testimonials />
    </div>
  );
};

export default Pitch;
