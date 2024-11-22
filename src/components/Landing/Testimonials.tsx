// components/Landing/Testimonials.tsx
// Outward links to all of our socials and docs. poorly named component.

import React from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { FaTwitter, FaGithub, FaDiscord, FaBook, FaTelegram } from "react-icons/fa";

const partners = [
  {
    icon: <FaDiscord style={{ fontSize: 35 }} />,
    link: "https://discord.gg/y7wM5YSpmm",
  },
  {
    icon: <FaTwitter style={{ fontSize: 35 }} />,
    link: "https://x.com/okay_bet_app",
  },
  {
    icon: <FaTelegram style={{ fontSize: 35 }} />,
    link: "https://t.me/+FnKD76WKUxxjYmQx",
  },
  {
    icon: <FaGithub style={{ fontSize: 35 }} />,
    link: "https://github.com/Okay-Bet/okay-bet-contracts",
  },
];

const Testimonials = () => {
  return (
    <section className="py-5 bg-primary text-quaternary">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <a
            href="https://docs.okaybet.fun/docs/intro" 
            className="text-font transform hover:scale-110 transition-transform flex items-center"
          >
            <FaBook style={{ fontSize: 35 }} />
            <span className="ml-2 mr-2 font-heading font-bold">Docs</span>
          </a>
          <div className="flex items-center space-x-6">
            {partners.map((partner, index) => (
              <a
                key={index}
                href={partner.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-font transform hover:scale-110 transition-transform"
              >
                {partner.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
