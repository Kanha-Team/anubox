export interface Creator {
  key: string;
  plain: string;
  name: string;
  handle: string;
  img: string;
  socials: Array<{
    icon: string;
    label: string;
    href: string;
  }>;
}

export const creators: Creator[] = [
  {
    key: "ayush",
    plain: "Ayush",
    name: "Ayush (Kanha)",
    handle: "Hackerbhai03",
    img: "/assets/img/creators.jpg",
    socials: [
      { icon: "send", label: "Telegram", href: "https://t.me/KingxAra" },
      { icon: "instagram", label: "Instagram", href: "https://instagram.com/careless__02" },
      { icon: "globe", label: "Portfolio", href: "https://raushan-pal.vercel.app" },
      { icon: "bot", label: "Bot", href: "https://t.me/AnuBoxBot" },
    ],
  },
];

export const specialThanks = [
  { name: "Anya", handle: "Itz-Anya" },
  { name: "Murali", handle: "Itz-Murali" },
];

export const githubProfile = (handle: string) => `https://github.com/${handle}`;
