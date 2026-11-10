import type { Metadata, Viewport } from "next";
import "./globals.css";
import Toasts from "@/components/Toasts";
import ScrollReveal from "@/components/ScrollReveal";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#160a12" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://anubox.vercel.app"),
  title: "AnuBox File Hosting Web: Free, Fast And Permanent File Hosting",
  description:
    "Upload Images, Video, Audio And Documents And Get A Permanent Direct Link In Seconds. Files Up To 100 MB, No Account Needed, Encrypted Before They Are Stored.",
  applicationName: "AnuBox File Hosting Web",
  authors: [{ name: "AnuBox File Hosting", url: "https://anubox.vercel.app" }],
  creator: "AnuBox File Hosting",
  publisher: "AnuBox File Hosting",
  manifest: "/manifest.webmanifest",
  generator: "Next.js",
  keywords: [
    "file hosting",
    "free file hosting",
    "image hosting",
    "video hosting",
    "permanent links",
    "direct link",
    "encrypted file storage",
    "upload files online",
    "file sharing",
    "file upload API",
    "AnuBox File Hosting",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/assets/img/icon.png",
    shortcut: "/assets/img/icon.png",
    apple: "/assets/img/icon.png",
  },
  openGraph: {
    title: "AnuBox File Hosting Web: Free, Fast And Permanent File Hosting",
    description:
      "Upload Images, Video, Audio And Documents And Get A Permanent Direct Link In Seconds. Files Up To 100 MB, No Account Needed, Encrypted Before They Are Stored.",
    url: "https://anubox.vercel.app",
    siteName: "AnuBox File Hosting Web",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/img/logo.png",
        width: 500,
        height: 500,
        alt: "AnuBox File Hosting Web Logo: A Pink-Haired Girl Beside A Cloud Upload Folder.",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "AnuBox File Hosting Web: Free, Fast And Permanent File Hosting",
    description:
      "Upload Images, Video, Audio And Documents And Get A Permanent Direct Link In Seconds. Files Up To 100 MB, No Account Needed, Encrypted Before They Are Stored.",
    images: ["/assets/img/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/assets/img/icon.png" />
        <link rel="preload" as="image" href="/assets/img/logo.png" />
      </head>
      <body>
        <Toasts />
        <ScrollReveal />
        {children}
      </body>
    </html>
  );
}
