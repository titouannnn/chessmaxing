import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { DataInitializer } from "@/components/data-initializer";

const manrope = Manrope({ 
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "CHESSMAXING",
  description: "Discover Clarity in Chess Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${manrope.variable} font-manrope bg-background text-on-background min-h-screen flex flex-col antialiased selection:bg-primary-container selection:text-on-primary`}>
        <DataInitializer />
        <Navbar />
        <main className="pt-24 flex-grow">
          {children}
        </main>
      </body>
    </html>
  );
}
