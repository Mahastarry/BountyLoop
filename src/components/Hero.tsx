import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, DollarSign, Layers, ShieldCheck, Zap } from 'lucide-react';

interface HeroProps {
  bounties: any[];
  onNavigate: (view: 'home' | 'browse' | 'post') => void;
  onSelectBounty: (bountyId: string) => void;
}

export default function Hero({ bounties = [], onNavigate, onSelectBounty }: HeroProps) {
  // Take top 3 bounties as featured
  const featuredBounties = bounties.slice(0, 3);
  
  // Total pool amount
  const totalPool = bounties.reduce((acc, curr) => acc + curr.reward, 0);

  return (
    <div id="landing-page" className="flex flex-col bg-white">
      {/* Hero Section */}
      <section id="hero-section" className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-32 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Tagline / Indicator */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-3 py-1 text-xs font-semibold tracking-wide text-neutral-800 border border-neutral-100"
          >
            <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span>Introducing BountyLoop Public Beta</span>
          </motion.div>

          {/* Primary Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-6xl md:text-7xl"
          >
            Solve real problems. <br />
            <span className="text-neutral-400 font-light italic">Get paid.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base sm:text-lg md:text-xl text-neutral-500 leading-relaxed font-normal"
          >
            A marketplace for funded technical bounties. Companies post problems with rewards. Builders submit solutions.
          </motion.p>

          {/* Call to Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <button
              id="hero-btn-browse"
              onClick={() => onNavigate('browse')}
              className="group inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 cursor-pointer"
            >
              Explore Bounties
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              id="hero-btn-post"
              onClick={() => onNavigate('post')}
              className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-6 py-3.5 text-sm font-semibold text-neutral-800 shadow-xs transition-all duration-200 hover:bg-neutral-50 cursor-pointer"
            >
              Post a Bounty
            </button>
          </motion.div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section id="stats-section" className="border-t border-b border-neutral-100 bg-neutral-50/50 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                ${totalPool.toLocaleString()}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mt-1">
                Active Bounty Pool Value
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                {bounties.length}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mt-1">
                Listed Bounties
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                6.6%
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mt-1">
                6.6% platform fee
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                Direct
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mt-1">
                Builder Delivery
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Loop */}
      <section id="how-it-works-section" className="py-20 md:py-28 px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">The Loop Cycle</h2>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3.5xl">
              A transparent, performance-vetted workflow
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl border border-neutral-100 bg-white shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-50 text-neutral-900 border border-neutral-100">
                <span className="font-mono text-lg font-bold">1</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-neutral-900">Post a Problem</h3>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                Companies list a technical challenge with precise requirements, deadline details, and designated reward size.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl border border-neutral-100 bg-white shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-50 text-neutral-900 border border-neutral-100">
                <span className="font-mono text-lg font-bold">2</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-neutral-900">Submit Solution</h3>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                Builders explore available bounties, write code solving the issue, and submit proof along with their portfolio/GitHub links.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl border border-neutral-100 bg-white shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-50 text-neutral-900 border border-neutral-100">
                <span className="font-mono text-lg font-bold">3</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-neutral-900">Select & Handover</h3>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                Organizations validate the solution. Once approved, payment is coordinated directly between companies and builders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Bounties Feed */}
      <section id="featured-feed-section" className="bg-neutral-50/40 py-20 border-t border-neutral-100 px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Featured Pool</h2>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
                Urgent open contracts
              </p>
            </div>
            <button 
              id="btn-all-bounties"
              onClick={() => onNavigate('browse')}
              className="mt-4 sm:mt-0 inline-flex items-center gap-1 text-sm font-semibold text-neutral-900 hover:text-neutral-500 transition-colors cursor-pointer"
            >
              Browse all {bounties.length} bounties
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div id="featured-bounties-grid" className="space-y-4">
            {featuredBounties.map((bounty) => {
              const platformFee = bounty.reward * 0.066;
              const isDemo = bounty.paymentStatus === 'UNFUNDED' || bounty.isDemo;
              
              return (
                <div 
                  key={bounty.id}
                  id={`featured-card-${bounty.id}`}
                  onClick={() => onSelectBounty(bounty.id)}
                  className="group relative flex flex-col justify-between gap-x-6 gap-y-4 rounded-xl border border-neutral-200/80 bg-white p-6 shadow-xs transition-all duration-200 hover:border-neutral-400 cursor-pointer sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                        {bounty.category}
                      </span>
                      {isDemo ? (
                        <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-100">
                          DEMO — NOT FUNDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                          FUNDED
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold leading-6 text-neutral-900 group-hover:text-neutral-600 flex items-center gap-2">
                      {bounty.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-x-2 text-xs text-neutral-500">
                      <span className="font-semibold text-neutral-700">{bounty.companyName || bounty.company || 'Org'}</span>
                      <span className="text-neutral-300">•</span>
                      <span>Deadline {new Date(bounty.deadline || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-x-4 sm:flex-col sm:items-end">
                    <div className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
                      ${bounty.reward.toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      After 6.6% platform fee: <span className="font-medium text-neutral-600">${(bounty.reward - platformFee).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-black group-hover:text-neutral-500 transition-colors hidden sm:block">
                      View Details &rarr;
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
