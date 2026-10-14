"use client";

import { useEffect, useState } from "react";

/**
 * Phones only (hidden by CSS above 680px): back and forward arrows that jump to
 * the previous or next section of an article, shown while the article is on screen.
 * `ids` are the section ids in reading order.
 */
export function ArticleStepNav({ ids }: { ids: string[] }) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const body = document.querySelector(".story-article");

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const i = ids.indexOf(entry.target.id);
          if (i >= 0) setCurrent(i);
        });
      },
      { rootMargin: "-30% 0px -55% 0px" }
    );
    sections.forEach((el) => sectionObserver.observe(el));

    const bodyObserver = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "-20% 0px -10% 0px" }
    );
    if (body) bodyObserver.observe(body);

    return () => {
      sectionObserver.disconnect();
      bodyObserver.disconnect();
    };
  }, [ids]);

  const go = (index: number) => {
    const el = document.getElementById(ids[index]);
    if (!el) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const atStart = current <= 0;
  const atEnd = current >= ids.length - 1;

  return (
    <div
      className={visible ? "step-nav is-visible" : "step-nav"}
      role="group"
      aria-label="Article sections"
    >
      <button
        type="button"
        aria-label="Previous section"
        disabled={atStart}
        onClick={() => go(current - 1)}
      >
        <svg viewBox="0 0 18 18" aria-hidden="true">
          <path d="M15 9H3M8.5 3.5 3 9l5.5 5.5" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Next section"
        disabled={atEnd}
        onClick={() => go(current + 1)}
      >
        <svg viewBox="0 0 18 18" aria-hidden="true">
          <path d="M3 9h12M9.5 3.5 15 9l-5.5 5.5" />
        </svg>
      </button>
    </div>
  );
}
