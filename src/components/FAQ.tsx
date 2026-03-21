"use client";

import { useState } from "react";

type FAQItem = {
  q: string;
  a: string;
};

export function FAQ({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(isOpen ? null : i)}
            className="w-full text-left glass rounded-xl p-5 hover:border-white/15 transition-all group"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-sm md:text-base group-hover:text-brand-400 transition-colors">
                {item.q}
              </span>
              <span
                className={`text-white/40 text-xl flex-shrink-0 transition-transform duration-300 ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isOpen ? "max-h-40 mt-3 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <p className="text-white/50 text-sm leading-relaxed">{item.a}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
