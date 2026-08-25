import { motion } from 'motion/react';
import { ArrowUpRight, Code, HelpCircle, Layers, Plus, LogOut, UserCheck, Shield, User } from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: 'home' | 'browse' | 'post' | 'admin' | 'dashboard') => void;
  currentUser: any;
  onOpenAuth: (isLogin?: boolean) => void;
  onSignOut: () => void;
}

export default function Header({ currentView, onNavigate, currentUser, onOpenAuth, onSignOut }: HeaderProps) {
  // Extract user initials for the avatar bubble
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <header id="header" className="sticky top-0 z-50 w-full border-b border-neutral-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Brand Logo */}
        <div 
          id="brand-logo-container"
          onClick={() => onNavigate('home')} 
          className="group flex cursor-pointer items-center gap-2"
        >
          <div id="brand-logo" className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white transition-transform duration-300 group-hover:scale-105">
            <Layers className="h-4 w-4" />
          </div>
          <span id="brand-text" className="font-sans text-xl font-bold tracking-tight text-neutral-900">
            Bounty<span className="font-light text-neutral-500">Loop</span>
          </span>
        </div>

        {/* Navigation Actions */}
        <nav id="main-navigation" className="hidden md:flex items-center gap-8">
          <button
            id="nav-link-browse"
            onClick={() => onNavigate('browse')}
            className={`font-sans text-sm font-medium transition-colors hover:text-black cursor-pointer ${
              currentView === 'browse' ? 'text-black font-semibold' : 'text-neutral-500'
            }`}
          >
            Explore Bounties
          </button>
          
          {currentUser && (
            <button
              id="nav-link-dashboard"
              onClick={() => onNavigate('dashboard')}
              className={`font-sans text-sm font-medium transition-colors hover:text-black cursor-pointer ${
                currentView === 'dashboard' ? 'text-black font-semibold' : 'text-neutral-500'
              }`}
            >
              Dashboard
            </button>
          )}

          <div id="nav-badge-fee" className="flex items-center gap-1.5 rounded-full bg-neutral-50 px-3.5 py-1 border border-neutral-100 text-xs text-neutral-600 font-medium" title="6.6% platform fee on successfully completed bounties. Payment infrastructure will be introduced before real-money transactions begin.">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            6.6% platform fee
          </div>
        </nav>

        {/* CTA Buttons */}
        <div id="header-cta-container" className="flex items-center gap-4">
          <button
            id="btn-nav-browse-mobile"
            onClick={() => onNavigate('browse')}
            className="md:hidden text-sm font-medium text-neutral-600 hover:text-black cursor-pointer px-3 py-1.5"
          >
            Browse
          </button>

          {/* User Section */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              {(currentUser.role === 'ADMIN' || currentUser.email === 'admin@bountyloop.com' || currentUser.email === 'mahaswetakingdom@gmail.com') && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 text-[11px] font-bold text-red-800 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Shield className="h-3.5 w-3.5 text-red-700" /> Control Panel
                </button>
              )}
              
              {/* Profile/Avatar Bubble */}
              <div 
                onClick={() => onNavigate('dashboard')}
                title="View Dashboard"
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className="h-8 w-8 rounded-full bg-neutral-900 flex items-center justify-center text-xs font-bold text-white group-hover:bg-neutral-800 transition-all border border-neutral-200/50">
                  {getInitials(currentUser.name)}
                </div>
                <span className="text-xs font-semibold text-neutral-700 max-w-[100px] truncate hidden sm:inline group-hover:text-black">
                  {currentUser.name}
                </span>
              </div>

              <button
                id="nav-link-dashboard-cta"
                onClick={() => onNavigate('dashboard')}
                className={`font-sans text-xs font-bold uppercase tracking-wider hover:text-black cursor-pointer hidden md:block ${
                  currentView === 'dashboard' ? 'text-black' : 'text-neutral-500'
                }`}
              >
                Dashboard
              </button>

              <button
                onClick={onSignOut}
                title="Log Out"
                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => onOpenAuth(true)}
                className="text-xs font-bold uppercase tracking-wider text-neutral-700 hover:text-black transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth(false)}
                className="rounded-md bg-neutral-100 text-neutral-800 px-3.5 py-1.5 text-xs font-bold tracking-wide uppercase hover:bg-neutral-200 transition-all cursor-pointer"
              >
                Get Started
              </button>
            </div>
          )}

          <button
            id="btn-nav-post"
            onClick={() => onNavigate('post')}
            className="group inline-flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 cursor-pointer active:scale-98"
          >
            <Plus className="h-3.5 w-3.5" />
            Post Bounty
          </button>
        </div>
      </div>
    </header>
  );
}
