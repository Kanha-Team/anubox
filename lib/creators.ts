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
    handle: "Kanha-Team",
    img: "/assets/img/creators.jpg",
    socials: [
      { icon: "send", label: "@xoknha", href: "https://t.me/xoknha" },
      { icon: "bot", label: "@meowcloner", href: "https://t.me/meowcloner" },
    ],
  },
];

export const githubProfile = (handle: string) => `https://github.com/${handle}`;
