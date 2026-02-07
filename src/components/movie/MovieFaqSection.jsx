// frontend-next/src/components/movie/MovieFaqSection.jsx
import React from 'react';

const normalizeFaqs = (faqs) => {
  const list = Array.isArray(faqs) ? faqs : [];
  return list
    .map((f) => ({
      question: String(f?.question || '').trim(),
      answer: String(f?.answer || '').trim(),
    }))
    .filter((f) => f.question && f.answer)
    .slice(0, 5);
};

export default function MovieFaqSection({ movie }) {
  const faqs = normalizeFaqs(movie?.faqs);

  // ✅ Only show if available
  if (!faqs.length) return null;

  return (
    <section className="my-16 bg-dry border border-border rounded-lg p-6 sm:p-8">
      <h2 className="text-white text-lg sm:text-xl font-semibold mb-4">
        Frequently Asked Questions
      </h2>

      <div className="space-y-3">
        {faqs.map((f, idx) => (
          <details
            key={idx}
            className="bg-main border border-border rounded-lg p-4"
          >
            <summary className="cursor-pointer text-white font-semibold text-sm sm:text-base">
              {f.question}
            </summary>
            <div className="mt-2 text-text text-sm leading-6 whitespace-pre-line">
              {f.answer}
            </div>
          </details>
        ))}
      </div>
    </section>  
  );
}
