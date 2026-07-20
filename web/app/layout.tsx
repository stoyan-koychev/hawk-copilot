import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

// Body font. Roboto is a variable font on Google Fonts, so no explicit weight
// is needed. Exposed as --font-roboto and consumed by --font-sans in globals.css.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hawk Copilot",
  description: "Grounded assistant over the Payhawk help center.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
