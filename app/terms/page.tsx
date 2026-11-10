"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { creators, githubProfile } from "@/lib/creators";

const GLANCE_CARDS: [string, string, string][] = [
  ["shield", "Encrypted Storage", "Every File Is Encrypted Before It Is Stored."],
  ["globe", "Links Are Open", "Anyone Who Has A Link Can Open The File."],
  ["ban", "Keep It Legal", "Illegal, Harmful Or Infringing Files Are Removed."],
  ["users", "Your Responsibility", "You Answer For What You Upload And Share."],
];

interface TermSection {
  id: string;
  title: string;
  icon: string;
  content: { p?: string; ul?: string[] }[];
}

const SECTIONS: TermSection[] = [
  {
    id: "accept",
    title: "Accepting These Terms",
    icon: "checkCircle",
    content: [
      {
        p: "By Opening AnuBox File Hosting Web, Uploading A File Or Using Our API, You Agree To These Terms & Conditions. If You Do Not Agree, Please Do Not Use The Service.",
      },
      {
        p: "You Must Be Old Enough To Form A Binding Agreement Where You Live, Or Have A Parent Or Guardian Agree For You.",
      },
    ],
  },
  {
    id: "service",
    title: "What The Service Is",
    icon: "cloudUp",
    content: [
      {
        p: "AnuBox File Hosting Web Lets You Upload A File And Get A Direct Link To It. You Do Not Need An Account. Files Are Split Into Pieces, Encrypted On Our Server And Stored With Third-Party Providers. The Same Rules Apply To Files Sent Through Our Telegram Bot.",
      },
      {
        p: "The Service Is Provided Free Of Charge And May Change, Slow Down Or Pause At Any Time. We Aim To Keep Links Working For As Long As We Can, But We Cannot Promise That A File Will Be Available Forever.",
      },
    ],
  },
  {
    id: "content",
    title: "Your Content And Your Responsibility",
    icon: "file",
    content: [
      {
        p: "You Are Responsible For Everything You Upload And For How You Share The Link. Anyone Who Has A Link Can Open The File, So Do Not Upload Anything You Want To Keep Private From The People You Share It With.",
      },
      {
        p: "You Confirm That You Own What You Upload Or Have The Right To Share It, And That Uploading It Does Not Break Any Law Or Anyone Else's Rights.",
      },
      {
        p: "You Keep Ownership Of Your Files. By Uploading, You Give Us Permission To Store, Encrypt, Copy And Deliver Them To Anyone Who Opens The Link, Only As Needed To Run The Service.",
      },
    ],
  },
  {
    id: "rules",
    title: "What You Must Not Upload",
    icon: "ban",
    content: [
      { p: "Do Not Use The Service For Any Of The Following:" },
      {
        ul: [
          "Anything That Sexualizes Or Exploits Children. We Remove It And Report It To The Authorities.",
          "Content That Is Illegal Where You Live Or Where We Operate.",
          "Viruses, Malware, Phishing Pages Or Anything Built To Harm Devices Or Steal Data.",
          "Files That You Do Not Have The Right To Share, Including Pirated Software, Films, Music And Books.",
          "Content That Threatens, Harasses Or Targets A Person Or Group, Or Shows Real Violence For Shock.",
          "Other People's Private Information, Such As ID Documents, Leaked Databases Or Private Photos Shared Without Consent.",
          "Spam, Or Using The Service As A Hosting Backend For A Site Or App In A Way That Puts Heavy Load On Us.",
        ],
      },
    ],
  },
  {
    id: "api",
    title: "Fair Use Of The API",
    icon: "code",
    content: [
      {
        p: "The Upload API Is Open So People Can Build Simple Tools. Please Keep Requests Reasonable. We May Rate Limit, Block Or Remove Access For Traffic That Harms The Service Or Other Users, Without Notice.",
      },
      {
        p: "Do Not Try To Get Around File Size Limits, Break The Encryption, Scan For Other People's Files Or Attack The Service.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy And Storage",
    icon: "lock",
    content: [
      {
        p: "We Keep Only What Is Needed To Run The Service: The Encrypted File Pieces, File Details Such As Name, Size And Type, And The IP Address That Made The Upload.",
      },
      {
        p: "The IP Address Is Kept For Abuse Protection. Only The Site Administrators Can See It. It Is Never Shown On The Website, Never Included In A Link Or An API Response, And Never Sold Or Shared With Advertisers. To Look Into Abuse, An Administrator May Check An Address With An IP Lookup Service, Which Shows Its Approximate Location And Network.",
      },
      {
        p: "When A File Is Deleted, The IP Address Stored With It Is Deleted Too.",
      },
      {
        p: "Files Sent Through The Telegram Bot Are Linked To Your Telegram ID, Username And Name, So The Bot Can List Your Files.",
      },
      {
        p: "Your Browser Also Keeps A Short Upload History On Your Own Device. You Can Clear It At Any Time From The History Panel.",
      },
      {
        p: "Encryption Protects The Stored Pieces From Outsiders. It Does Not Make A File Private From Anyone Who Has The Link.",
      },
    ],
  },
  {
    id: "removal",
    title: "Removal And Reports",
    icon: "trash",
    content: [
      {
        p: "We May Remove Any File, Block Any Link Or Restrict Any User At Any Time, With Or Without Notice, If We Think These Terms Are Broken Or The File Creates Risk For Us Or Others.",
      },
      {
        p: "If You Believe A File Infringes Your Copyright Or Breaks The Rules Above, Send Us The Link To The File And A Short Explanation Through One Of The Creators' GitHub Profiles Listed Below. We Review Reports As Soon As We Can.",
      },
    ],
  },
  {
    id: "warranty",
    title: "No Warranty",
    icon: "alert",
    content: [
      {
        p: 'The Service Is Provided "As Is" And "As Available". We Do Not Promise That It Will Be Fast, Error Free, Secure From Every Attack Or Always Online, Or That Files Will Never Be Lost.',
      },
      {
        p: "Please Keep Your Own Copy Of Anything Important. Do Not Use This Service As Your Only Backup.",
      },
    ],
  },
  {
    id: "liability",
    title: "Limit Of Liability",
    icon: "shield",
    content: [
      {
        p: "To The Fullest Extent The Law Allows, The Creators And Operators Of AnuBox File Hosting Are Not Liable For Any Loss, Damage Or Lost Data That Comes From Using The Service, From Files Uploaded By Other People, Or From The Service Being Unavailable.",
      },
      {
        p: "You Agree To Cover Any Claim Or Loss That Comes From The Files You Upload Or From Your Breaking These Terms.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes To These Terms",
    icon: "refresh",
    content: [
      {
        p: "We May Update These Terms From Time To Time. The Date At The Top Of This Page Shows The Latest Version. If You Keep Using The Service After A Change, You Accept The New Terms.",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    icon: "send",
    content: [
      {
        p: "Questions Or Reports? Reach The Creators Through Their GitHub Profiles.",
      },
    ],
  },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const progressRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-90px 0px -60% 0px" }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          ticking = false;
          const bodyEl = bodyRef.current;
          const barEl = progressRef.current;
          if (!bodyEl || !barEl) return;
          const rect = bodyEl.getBoundingClientRect();
          const totalH = Math.max(1, rect.height - 0.5 * window.innerHeight);
          const ratio = Math.min(
            1,
            Math.max(0, (0.25 * window.innerHeight - rect.top) / totalH)
          );
          barEl.style.transform = `scaleX(${ratio})`;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <>
      <div className="legal-progress" ref={progressRef} aria-hidden="true" />
      <Nav active="/terms" />
      <main id="main">
        <header className="legal-hero">
          <div className="wrap rise">
            <span className="kicker">Legal</span>
            <h1>Terms & Conditions</h1>
            <p>
              The Simple Rules For Using AnuBox File Hosting Web. Please Read Them Before You Upload.
            </p>
            <div className="legal-meta">
              <span className="legal-updated">Last Updated October 30, 2026</span>
              <span className="legal-read">
                <Icon name="clock" /> 5 Min Read
              </span>
            </div>
          </div>
        </header>

        <div className="wrap">
          <div className="legal-glance">
            {GLANCE_CARDS.map(([icon, title, desc]) => (
              <article key={title} className="glance-card">
                <span className="glance-ico">
                  <Icon name={icon} />
                </span>
                <h2>{title}</h2>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="wrap legal-grid">
          <nav className="legal-toc" aria-label="On This Page">
            {SECTIONS.map((sec, idx) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className={activeSection === sec.id ? "on" : ""}
                aria-current={activeSection === sec.id ? "location" : undefined}
              >
                {idx + 1}. {sec.title}
              </a>
            ))}
          </nav>

          <div className="legal-body" ref={bodyRef}>
            {SECTIONS.map((sec, idx) => (
              <section key={sec.id} id={sec.id} aria-labelledby={`${sec.id}-h`}>
                <h2 id={`${sec.id}-h`}>
                  <span className="sec-ico" aria-hidden="true">
                    <Icon name={sec.icon} />
                  </span>
                  <span className="sec-title">
                    <small>Section {idx + 1}</small>
                    {sec.title}
                  </span>
                </h2>
                {sec.content.map((c, cIdx) =>
                  c.ul ? (
                    <ul key={cIdx}>
                      {c.ul.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={cIdx}>{c.p}</p>
                  )
                )}
                {sec.id === "contact" && (
                  <div className="legal-contact">
                    {creators.map((c) => (
                      <a
                        key={c.key}
                        className="btn"
                        href={githubProfile(c.handle)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon name="github" /> {c.handle}
                      </a>
                    ))}
                  </div>
                )}
              </section>
            ))}

            <div className="legal-actions">
              <Link className="btn btn-primary" href="/">
                <Icon name="upload" /> Back To Uploading
              </Link>
              <button
                type="button"
                className="btn"
                onClick={() => window.print()}
              >
                <Icon name="printer" /> Print
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <Icon name="arrowUp" /> Back To Top
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
