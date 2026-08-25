import { Layers, Github, FileText, Shield, Info } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'home' | 'browse' | 'post') => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer id="footer" className="w-full border-t border-neutral-100 bg-neutral-50/50 py-12 md:py-16 text-neutral-600 font-sans">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div id="footer-top" className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Logo & Description */}
          <div id="footer-logo-section" className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-neutral-900">
                Bounty<span className="font-light text-neutral-500">Loop</span>
              </span>
            </div>
            <p className="max-w-xs text-sm text-neutral-500 leading-relaxed">
              The minimalist technical bounty network. Connect premium organizations directly with elite independent builders.
            </p>
          </div>

          {/* Platform Fee & Model Details */}
          <div id="footer-fee-section" className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">Platform Mechanics</h3>
            <div className="space-y-2 text-sm text-neutral-500 leading-relaxed">
              <p>
                BountyLoop collects a flat <strong className="text-neutral-900 font-semibold">6.6% platform fee</strong> on successfully completed bounties. No hidden margins.
              </p>
              <div className="flex items-start gap-1.5 rounded-lg border border-neutral-100 bg-neutral-50 p-2 text-xs">
                <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>Please note: Payment infrastructure will be introduced before real-money transactions begin. For now, payments are handled directly between companies and builders.</span>
              </div>
            </div>
          </div>

          {/* Quick Nav & Links */}
          <div id="footer-links-section" className="space-y-4 md:pl-10">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">Explore</h3>
            <ul className="space-y-2 text-sm text-neutral-500">
              <li>
                <button 
                  id="footer-link-browse"
                  onClick={() => onNavigate('browse')}
                  className="hover:text-black cursor-pointer transition-colors"
                >
                  Explore Bounties
                </button>
              </li>
              <li>
                <button 
                  id="footer-link-post"
                  onClick={() => onNavigate('post')}
                  className="hover:text-black cursor-pointer transition-colors"
                >
                  Post a Bounty
                </button>
              </li>
              <li>
                <button 
                  id="footer-link-home"
                  onClick={() => onNavigate('home')}
                  className="hover:text-black cursor-pointer transition-colors"
                >
                  Landing Page
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom / Regulatory & Mock notice */}
        <div id="footer-bottom" className="mt-12 flex flex-col gap-4 border-t border-neutral-100 pt-8 sm:flex-row sm:items-center sm:justify-between text-xs text-neutral-400">
          <p>© {new Date().getFullYear()} BountyLoop. All rights reserved. Public Beta Release.</p>
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>Note: Sandbox listings are marked “DEMO — NOT FUNDED”. Real listings are marked “FUNDED”.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
