import type { Metadata, Viewport } from "next";
import { Cairo, Outfit } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5EFE1" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F14" },
  ],
};

export const metadata: Metadata = {
  title: "منصة المنهج | كلية التربية جامعة بني سويف",
  description: "المنصة الأكاديمية لشعبة رياضيات - الفرقة الثانية، كلية التربية (عام) جامعة بني سويف",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${outfit.variable} overflow-x-clip max-w-[100vw]`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Egyptian+Hieroglyphs&display=swap" rel="stylesheet" />
        <script
          id="theme-initializer"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var persona = localStorage.getItem('bsu_portal_persona') || 'boys';
                  var mode = localStorage.getItem('bsu_portal_mode');
                  if (!mode) {
                    var oldTheme = localStorage.getItem('bsu_math_theme');
                    mode = oldTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  }
                  document.documentElement.setAttribute('data-persona', persona);
                  document.documentElement.setAttribute('data-mode', mode);
                  if (mode === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                  var p = {
                    'boys-light': {'--bg-page':'#F5EFE1','--bg-surface':'#FFFFFF','--bg-surface-elevated':'#FAF5EA','--text-primary':'#162828','--accent-primary':'#184E4E','--border-subtle':'#E3D7C1','--math-formula-color':'#184E4E'},
                    'boys-dark': {'--bg-page':'#0B0F14','--bg-surface':'#131922','--bg-surface-elevated':'#1C2533','--text-primary':'#F1F5F9','--accent-primary':'#2DD4BF','--border-subtle':'#1E2B3A','--math-formula-color':'#5EEAD4'},
                    'girls-light': {'--bg-page':'#FAF5F0','--bg-surface':'#FFFFFF','--bg-surface-elevated':'#FFF7F9','--text-primary':'#381D26','--accent-primary':'#C46D82','--border-subtle':'#F4D7DE','--math-formula-color':'#381D26'},
                    'girls-dark': {'--bg-page':'#0D0811','--bg-surface':'#1A0F1E','--bg-surface-elevated':'#28162F','--text-primary':'#FFF1F5','--accent-primary':'#FF6584','--border-subtle':'rgba(244,114,182,0.18)','--math-formula-color':'#FFE4EC'}
                  };
                  var t = p[persona + '-' + mode];
                  if (t) {
                    for (var k in t) document.documentElement.style.setProperty(k, t[k]);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased transition-colors duration-200 overflow-x-clip max-w-[100vw] w-full">
        {children}
      </body>
    </html>
  );
}
