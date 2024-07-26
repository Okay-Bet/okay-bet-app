// components/Landing/Testimonials.tsx
import React, { useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import { FaTwitter, FaGithub, FaDiscord } from "react-icons/fa"; 


const testimonials = [
  {
    face: "/bets.png",
    name: "Base Onchain Summer Buildathon",
    testimonial: "From the team behind Bets with Friends",
  },
  {
    face: "/noah.png",
    name: "Noah, Electrician/Degenerate",
    testimonial:
      "I feel like this has so much potential in today's young men's lifestyle",
  },
];

const partners = [
  {
    icon: <FaDiscord style={{ fontSize: 40 }} />, // Add Discord icon here
    link: "https://discord.gg/y7wM5YSpmm",
  },
  {
    icon: <FaTwitter style={{ fontSize: 40 }} />,
    link: "https://x.com/okay_bet_app",
  },
  {
    icon: <FaGithub style={{ fontSize: 40 }} />,
    link: "https://github.com/Okay-Bet/okay-bet-contracts",
  },
];

const Testimonials = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    beforeChange: (current: number, next: number) => setActiveSlide(next),
  };

  return (
    <section className="py-10 bg-primary text-quaternary">
      <div className="container mx-auto px-6">
        {/* <Slider {...settings} className="mb-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="text-center">
              <img
                src={testimonial.face}
                alt={testimonial.name}
                className="w-24 h-24 mx-auto rounded-full mb-4"
              />
              <p className="text-xl font-semibold mb-2">{testimonial.name}</p>
              <p className="text-lg">{testimonial.testimonial}</p>
            </div>
          ))}
        </Slider> */}
        <div className="flex justify-end items-right space-x-6">
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
    </section>
  );
};

export default Testimonials;
