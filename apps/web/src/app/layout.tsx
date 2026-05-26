import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "bierhaben.com - Der Biermarkt für die DACH-Region",
  description: "Alles für eine Kiste Bier. Die Tauschbörse, wo Gegenstände in Bier statt Euro gehandelt werden.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground`} suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <EmailVerificationBanner />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
