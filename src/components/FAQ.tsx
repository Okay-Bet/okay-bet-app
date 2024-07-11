// src/components/FAQ.tsx

import React, { useState } from "react";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Where does my money go when I bet?",
      answer: "The money is held in an escrow smart contract, only the Decider may control which better gets the pot, but they are not able to keep the money for themselves.",
    },
    {
      question: "How do I get paid when I win?",
      answer: "The money is automatically sent to your wallet when the Decider settles the bet.",
    },
    {
      question: "Can a bet get cancelled?",
      answer: "If a bet is not yet fully funded then any of the 3 parties may cancel it. If a bet is fully funded then only the Decider may cancel and refund the betters.",
    },
    {
      question: "What currency is the bet in?",
      answer: "The bet is made in Ethereum on the Base network, because of this the USD value of the bet may change due to the volatility of the market.",
    },
    {
      question: "Is this safe?",
      answer: "While the contracts are extensively tested, there is always a risk when using smart contracts. Please only bet what you can afford to lose, this is for fun not investment.",
    },
  ];

  const toggleAnswer = (index: number) => {
    if (openIndex === index) {
      setOpenIndex(null);
    } else {
      setOpenIndex(index);
    }
  };

  return (
    <section className="py-20 bg-tertiary text-quaternary">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-heading text-font italic mb-8 text-center">FAQs</h2>
        <div className="space-y-6 text-left">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-quaternary pb-4">
              <h3
                className="text-xl md:text-2xl font-subheading mb-2 cursor-pointer"
                onClick={() => toggleAnswer(index)}
              >
                {faq.question}
              </h3>
              {openIndex === index && (
                <p className="text-lg md:text-xl">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
