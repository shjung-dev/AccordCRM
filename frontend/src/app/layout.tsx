import "./globals.css";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Sans } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";

import {
  getSessionSecret,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/session";
import type { User } from "@/types";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AccordCRM",
  description: "Customer Relationship Management (CRM) System",
};

async function getInitialUser(): Promise<User | null> {
  const secret = getSessionSecret();
  if (!secret) return null;
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token, secret);
  if (!payload) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { iat: _iat, exp: _exp, ...user } = payload;
  return user as User;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUser = await getInitialUser();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('accord-crm-theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${ibmPlexSans.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider initialUser={initialUser}>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
