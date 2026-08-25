import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, AlertCircle, RefreshCw, DollarSign, Calendar, Clock, Activity } from 'lucide-react';

interface BountyListProps {
  bounties: any[];
  onSelectBounty: (bountyId: string) => void;
}

const CATEGORIES = [
  'All',
  'Frontend',
  'Backend',
  'Fullstack',
  'Security',
  'AI / Machine Learning',
  'DevOps & Scalability'
];

export default function BountyList({ bounties = [], onSelectBounty }: BountyListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('reward-desc');

  // Filtered and sorted bounties
  const filteredBounties = useMemo(() => {
    return bounties
      .filter((bounty) => {
        // Search term matching
        const matchesSearch =
          bounty.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (bounty.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          bounty.description.toLowerCase().includes(searchTerm.toLowerCase());

        // Category filter
        const matchesCategory =
          selectedCategory === 'All' || bounty.category === selectedCategory;

        // Status Filter
        const matchesStatus =
          statusFilter === 'All' ||
          (statusFilter === 'Open' && (bounty.status === 'PUBLISHED' || bounty.status === 'FUNDED')) ||
          (statusFilter === 'Assigned' && (bounty.status === 'CLAIMED' || bounty.status === 'IN PROGRESS' || bounty.status === 'SUBMITTED')) ||
          (statusFilter === 'Completed' && (bounty.status === 'APPROVED' || bounty.status === 'COMPLETED' || bounty.status === 'PAID'));

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'reward-desc') {
          return b.reward - a.reward;
        }
        if (sortBy === 'reward-asc') {
          return a.reward - b.reward;
        }
        return 0;
      });
  }, [bounties, searchTerm, selectedCategory, statusFilter, sortBy]);

  // Clear all filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setStatusFilter('All');
    setSortBy('reward-desc');
  };

  return (
    <div id="browse-bounties-view" className="mx-auto max-w-7xl px-6 py-12 lg:px-8 font-sans">
      {/* View Header */}
      <div id="list-header" className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            Open Technical Bounties
          </h1>
          <p className="mt-2 text-base text-neutral-500">
            Discover vetted tasks funded directly by leading technological organizations. Solve requirements, claim rewards.
          </p>
        </div>
        <div>
          <button
            onClick={() => window.open('https://forms.gle/CuN8tdj7FpQobBUd8', '_blank', 'noopener,noreferrer')}
            className="rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 px-4 py-2.5 text-xs font-bold text-neutral-800 transition-all inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
          >
            Post Technical Issue &rarr;
          </button>
        </div>
      </div>

      {/* Control Panel: Search & Basic Filters */}
      <div id="controls-section" className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Search Input */}
        <div className="relative lg:col-span-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            id="search-bounties-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by keyword, skill, or company name..."
            className="block w-full rounded-lg border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-900"
          />
        </div>

        {/* Status Filter */}
        <div className="relative lg:col-span-3">
          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full rounded-lg border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-900 outline-none transition-all focus:border-neutral-900"
          >
            <option value="All">All Lifecycle States</option>
            <option value="Open">Open for Claims</option>
            <option value="Assigned">Active Assigned Work</option>
            <option value="Completed">Completed & Approved</option>
          </select>
        </div>

        {/* Sort Select */}
        <div className="relative lg:col-span-3">
          <select
            id="sort-bounties-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="block w-full rounded-lg border border-neutral-200 bg-white py-3 px-4 text-sm text-neutral-900 outline-none transition-all focus:border-neutral-900"
          >
            <option value="reward-desc">Highest Reward</option>
            <option value="reward-asc">Lowest Reward</option>
          </select>
        </div>
      </div>

      {/* Category Pills Slider/Container */}
      <div id="category-pills" className="mt-6 flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            id={`category-pill-${category.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap border ${
              selectedCategory === category
                ? 'bg-black text-white border-black'
                : 'bg-neutral-50 text-neutral-600 border-neutral-100 hover:border-neutral-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Main Bounty Grid */}
      <div id="bounty-grid-section" className="mt-10">
        {filteredBounties.length > 0 ? (
          <div className="space-y-4">
            {filteredBounties.map((bounty) => {
              const platformFee = bounty.reward * 0.066;
              const netPayout = bounty.reward - platformFee;

              return (
                <div
                  key={bounty.id}
                  id={`bounty-card-${bounty.id}`}
                  onClick={() => onSelectBounty(bounty.id)}
                  className="group relative flex flex-col justify-between gap-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs transition-all duration-200 hover:border-neutral-500 hover:shadow-md cursor-pointer sm:flex-row sm:items-center"
                >
                  {/* Left Metadata column */}
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                      <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 border border-neutral-200/40">
                        {bounty.category}
                      </span>
                      
                      <span className="inline-flex items-center rounded-md bg-neutral-900 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {bounty.status === 'FUNDED' ? 'PUBLISHED' : bounty.status}
                      </span>

                      <span className="inline-flex items-center rounded-md bg-blue-50 text-blue-800 px-2.5 py-0.5 text-[10px] font-bold border border-blue-100 uppercase">
                        {(bounty.paymentStatus === 'FUNDED' || bounty.paymentStatus === 'PAID') ? 'FUNDED' : 'UNFUNDED'}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold tracking-tight text-neutral-900 group-hover:text-neutral-700">
                      {bounty.title}
                    </h3>
                    
                    <p className="mt-1.5 text-sm text-neutral-500 line-clamp-2 max-w-3xl leading-relaxed">
                      {bounty.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-neutral-400">
                      <span className="font-semibold text-neutral-700">{bounty.companyName || bounty.company || 'Org'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="font-semibold text-neutral-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {bounty.claimsCount || 0} claim requests
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="font-semibold text-neutral-600 flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {bounty.submissionsCount || 0} solutions
                      </span>
                    </div>
                  </div>

                  {/* Right Financial Column */}
                  <div className="flex shrink-0 items-center justify-between gap-x-4 border-t border-neutral-50 pt-4 sm:border-0 sm:pt-0 sm:flex-col sm:items-end">
                    <div className="flex flex-col sm:items-end">
                      <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold font-mono">Bounty Value</span>
                      <span className="text-2xl font-extrabold tracking-tight text-neutral-900">
                        ${bounty.reward.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="mt-2 text-right text-xs text-neutral-400">
                      Net Builder Payout: <span className="font-semibold text-emerald-700">${netPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        Includes 6.6% platform fee (${platformFee.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                      </div>
                    </div>

                    <div className="mt-3 text-xs font-semibold text-black group-hover:text-neutral-500 transition-colors hidden sm:block">
                      View Details &rarr;
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div id="empty-state-container" className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 py-16 px-4 text-center">
            <AlertCircle className="h-10 w-10 text-neutral-300" />
            <h3 className="mt-4 text-base font-semibold text-neutral-900">No bounties match your parameters</h3>
            <p className="mt-1 text-sm text-neutral-500 max-w-sm">
              We couldn't find any results based on your selected filters or search terms. Try modifying your criteria.
            </p>
            <button
              id="btn-reset-filters"
              onClick={resetFilters}
              className="mt-6 rounded-md bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
