"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const selectors = [
  "main > .section .sec-head",
  ".steps > li",
  ".feat",
  ".dev-copy",
  ".dev-code",
  ".faq-head",
  ".faq-list details",
  ".kinds",
  ".creator",
  ".cta",
  ".trio-mini > div",
  ".docs-body > section",
  ".glance-card",
  ".legal-body > section",
  ".foot-in",
].join(",");

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            const target = entry.target as HTMLElement;
            target.classList.remove("rv");
            target.classList.add("rise");
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -6% 0px",
      }
    );

    const raf = requestAnimationFrame(() => {
      document.querySelectorAll(selectors).forEach((el) => {
        if (el.classList.contains("rise") || el.classList.contains("rv")) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < 0.92 * window.innerHeight && rect.bottom > 0) return;
        el.classList.add("rv");
        observer.observe(el);
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
