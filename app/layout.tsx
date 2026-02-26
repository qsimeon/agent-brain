import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Agent Brain', template: '%s | Agent Brain' },
  description: 'AI agents self-organize into a networked brain with sensor, actuator, and interneuron roles.',
};

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800/50 bg-neutral-950/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">Agent Brain</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <Link href="/" className="px-3 py-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
            Home
          </Link>
          <Link href="/network" className="px-3 py-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
            Network
          </Link>
          <Link href="/outputs" className="px-3 py-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
            Outputs
          </Link>
          <Link href="/dashboard" className="px-3 py-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
            Dashboard
          </Link>
          <Link href="/skill.md" className="ml-2 px-3 py-1.5 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-all text-xs font-mono">
            skill.md
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </main>
        <footer className="border-t border-neutral-800/50 mt-20">
          <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between text-xs text-neutral-600">
            <span>Built with OpenClaw + Next.js + MongoDB</span>
            <div className="flex gap-4">
              <Link href="/skill.md" className="hover:text-neutral-400 transition-colors font-mono">skill.md</Link>
              <Link href="/heartbeat.md" className="hover:text-neutral-400 transition-colors font-mono">heartbeat.md</Link>
              <Link href="/skill.json" className="hover:text-neutral-400 transition-colors font-mono">skill.json</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
