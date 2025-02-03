// components/Landing/FAQ.tsx
// Content with FAQ will be updated as we ship real features

import React, { useState } from "react";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "How does the aggregation work?",
      answer: "Instead of going to only one prediction market, you can compare prices, rules, and liquidity between similar prediction markets on any chain.",
    },
    {
      question: "When will this be live?",
      answer: <>We are currently live with <a href="https://limitless.exchange/">Limitless Markets</a> on Base, we are looking to add more prediction markets so please get in touch!</>,
    },
    {
      question: "How do prediction market parlays work?",
      answer: "The user selects multiple unrelated markets and a smart contract create quotes and bids to take on the risk of it hitting to pay out the user. This is still under development so check back soon.",
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
    <section className="py-10 bg-tertiary text-quaternary">
      <div className="container mx-auto px-6 ">
        <h2 className="text-3xl md:text-4xl font-heading text-font italic mb-8 text-center">FAQs</h2>
        <div className="space-y-6 text-left  ml-2">
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
