// components/Landing/FAQ.tsx
// Content with FAQ will be updated as we ship real features

import React, { useState } from "react";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "How does the aggregation work?",
      answer:
        "Instead of going to only one prediction market, you can compare prices, rules, and liquidity between similar prediction markets on any chain.",
    },
    {
      question: "When will this be live?",
      answer: (
        <>
          We are currently live with{" "}
          <a href="https://limitless.exchange/">Limitless Markets</a> on Base,
          we are looking to add more prediction markets so please get in touch!
        </>
      ),
    },
    {
      question: "How do prediction market parlays work?",
      answer:
        "The user selects multiple unrelated markets and a smart contract create quotes and bids to take on the risk of it hitting to pay out the user. This is still under development so check back soon.",
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
    <section className="relative overflow-hidden">
      {/* Enhanced Orange Background with Gradients */}
      <div className="absolute inset-0">
        {/* Base orange color */}
        <div className="absolute inset-0 bg-tertiary" />

        {/* Darker gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/20" />

        {/* Accent gradient streaks */}
        <div className="absolute inset-0">
          <div
            className="absolute top-0 right-0 w-full h-full 
                         bg-gradient-to-bl from-[#FF6B00]/30 via-transparent to-transparent"
          />
          <div
            className="absolute bottom-0 left-0 w-full h-full 
                         bg-gradient-to-tr from-black/20 via-transparent to-transparent"
          />
        </div>

        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 bg-[linear-gradient(-45deg,rgba(255,255,255,0.05)_1px,transparent_1px)] 
                       bg-[size:40px_40px] opacity-50"
        />
      </div>
      <div className="relative py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-heading text-white italic mb-8 text-shadow-aggressive">
              FAQs
            </h2>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="group"
                onClick={() => toggleAnswer(index)}
              >
                <div
                  className={`relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg 
                                transform transition-all duration-300 cursor-pointer
                                ${
                                  openIndex === index
                                    ? "shadow-aggressive"
                                    : "hover:shadow-sharp"
                                }`}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-heading text-white pr-8">
                        {faq.question}
                      </h3>
                      <span
                        className={`text-white transition-transform duration-300 text-2xl
                                     ${openIndex === index ? "rotate-45" : ""}`}
                      >
                        +
                      </span>
                    </div>

                    {openIndex === index && (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="text-white/90 text-lg leading-relaxed">
                          {typeof faq.answer === "object" ? (
                            <p>
                              We are currently live with{" "}
                              <a
                                href="https://limitless.exchange/"
                                className="text-white hover:text-black transition-colors underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Limitless Markets
                              </a>{" "}
                              on Base, we are looking to add more prediction
                              markets so please get in touch!
                            </p>
                          ) : (
                            faq.answer
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
