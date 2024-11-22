// components/Landing/FAQ.tsx
import React, { useState } from "react";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "How does the aggregation work?",
      answer: "When you make an order a quote is generated for relayers to execute it on the other chains for a minimal fee.",
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
