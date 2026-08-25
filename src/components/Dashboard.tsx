import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { 
  User, Briefcase, Shield, Mail, Tag, Clock, CheckCircle, 
  ExternalLink, Code, Github, Sparkles, Save, HelpCircle, ArrowRight
} from 'lucide-react';

interface DashboardProps {
  currentUser: any;
  onNavigate: (view: any) => void;
  showToast: (msg: string) => void;
  onUpdateUser: (user: any) => void;
}

export default function Dashboard({ currentUser, onNavigate, showToast, onUpdateUser }: DashboardProps) {
  const [role, setRole] = useState<'COMPANY' | 'BUILDER'>(currentUser?.role === 'COMPANY' ? 'COMPANY' : 'BUILDER');
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [skills, setSkills] = useState('');
  
  const [myBounties, setMyBounties] = useState<any[]>([]);
  const [developerApps, setDeveloperApps] = useState<any[]>([]);
  const [creatorApps, setCreatorApps] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'bounties' | 'applications'>('profile');

  // Load profile and related data
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const res = await api.getMe();
        if (res) {
          setName(res.user.name);
          setRole(res.user.role === 'COMPANY' ? 'COMPANY' : 'BUILDER');
          
          if (res.user.role === 'COMPANY') {
            setCompanyName(res.profile?.companyName || '');
            setWebsite(res.profile?.website || '');
            setBio(res.profile?.bio || '');
          } else {
            setGithubUsername(res.profile?.githubUsername || '');
            setSkills(res.profile?.skills ? res.profile.skills.join(', ') : '');
            setBio(res.profile?.bio || '');
          }
        }

        // Fetch all public bounties to filter for user relevance
        const allBounties = await api.getBounties();
        
        if (currentUser?.role === 'COMPANY') {
          // Posted by this user's company profile
          setMyBounties(allBounties.filter(b => b.companyId === res?.profile?.id || b.companyName === res?.profile?.companyName));
          try {
            const apps = await api.getCreatorApplications();
            setCreatorApps(apps || []);
          } catch (e) {
            console.error('Error fetching creator applications:', e);
          }
        } else {
          // Bounties they claimed or submitted
          setMyBounties(allBounties);
          try {
            const apps = await api.getDeveloperApplications();
            setDeveloperApps(apps || []);
          } catch (e) {
            console.error('Error fetching developer applications:', e);
          }
        }

      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name,
        role,
        bio
      };

      if (role === 'COMPANY') {
        payload.companyName = companyName || `${name}'s Organization`;
        payload.website = website || undefined;
      } else {
        payload.githubUsername = githubUsername || undefined;
        payload.skills = skills ? skills.split(',').map(s => s.trim()) : [];
      }

      const res = await api.updateProfile(payload);
      onUpdateUser(res.user);
      showToast('Profile configuration updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div id="dashboard-loading" className="mx-auto max-w-7xl px-6 py-24 text-center font-sans">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-black"></div>
          <h2 className="text-base font-semibold text-neutral-900">Synchronizing private workspace data...</h2>
        </div>
      </div>
    );
  }

  return (
    <div id="user-dashboard-view" className="mx-auto max-w-7xl px-6 py-12 lg:px-8 font-sans">
      {/* Header section */}
      <div className="border-b border-neutral-100 pb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            Developer Workspace
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your profiles, track your claim applications, and explore open active listings.
          </p>
        </div>

        {currentUser?.role === 'COMPANY' && (
          <button
            onClick={() => onNavigate('post')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Post a New Bounty
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Main Layout Grid */}
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Navigation tabs left sidebar */}
        <div className="lg:col-span-3 space-y-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left rounded-lg px-4 py-3 text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-100 hover:border-neutral-300'
            }`}
          >
            Account Settings & Role
          </button>
          
          <button
            onClick={() => setActiveTab('bounties')}
            className={`w-full text-left rounded-lg px-4 py-3 text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'bounties'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-100 hover:border-neutral-300'
            }`}
          >
            {role === 'COMPANY' ? 'My Listed Bounties' : 'Active Marketplace'}
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`w-full text-left rounded-lg px-4 py-3 text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-100 hover:border-neutral-300'
            }`}
          >
            {role === 'COMPANY' ? 'Incoming Applications' : 'My Applied Claims'}
          </button>
        </div>

        {/* Dynamic Panel Right */}
        <div className="lg:col-span-9 bg-white border border-neutral-200 rounded-2xl p-6 lg:p-8 shadow-xs">
          {activeTab === 'applications' && (
            <div id="panel-applications-feed" className="animate-fade-in space-y-6">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">
                  {role === 'COMPANY' ? 'Received Claim Applications' : 'Your Submitted Claim Applications'}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {role === 'COMPANY' 
                    ? 'Review developer profiles and experience statements to assign your bounties.' 
                    : 'Track your pending/approved assignments and check active workflow instructions.'}
                </p>
              </div>

              {role === 'COMPANY' ? (
                creatorApps.length > 0 ? (
                  <div className="space-y-4">
                    {creatorApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => onNavigate(`detail-${app.bountyId}`)}
                        className="p-5 border border-neutral-200 rounded-xl hover:border-black cursor-pointer transition-colors space-y-3 text-xs"
                      >
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div>
                            <span className="font-extrabold text-neutral-900 text-sm">{app.developerName}</span>
                            <span className="text-neutral-400 ml-2">applied for <strong>{app.bountyTitle}</strong></span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            app.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            app.status === 'REJECTED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                          }`}>
                            {app.status}
                          </span>
                        </div>

                        {app.message && (
                          <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100 italic text-neutral-600">
                            "{app.message}"
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span>GitHub: @{app.githubUsername}</span>
                          <span>Filed: {new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-neutral-200 rounded-xl">
                    <Clock className="h-8 w-8 text-neutral-300 mx-auto" />
                    <h4 className="font-bold text-neutral-900 mt-2">No Applications Yet</h4>
                    <p className="text-xs text-neutral-500 mt-1">Once developers apply to claim your bounties, they will show up here for manual assignment.</p>
                  </div>
                )
              ) : (
                developerApps.length > 0 ? (
                  <div className="space-y-4">
                    {developerApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => onNavigate(`detail-${app.bountyId}`)}
                        className="p-5 border border-neutral-200 rounded-xl hover:border-black cursor-pointer transition-colors space-y-3 text-xs"
                      >
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-neutral-900">{app.bountyTitle}</h4>
                            <p className="text-[10px] text-neutral-400 mt-0.5">Application Status</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            app.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            app.status === 'REJECTED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                          }`}>
                            {app.status}
                          </span>
                        </div>

                        {app.message && (
                          <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100 italic text-neutral-600">
                            "{app.message}"
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span>Bounty Reward: ${app.bountyReward?.toLocaleString() || 'N/A'}</span>
                          <span>Filed: {new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-neutral-200 rounded-xl">
                    <Clock className="h-8 w-8 text-neutral-300 mx-auto" />
                    <h4 className="font-bold text-neutral-900 mt-2">No Applied Claims</h4>
                    <p className="text-xs text-neutral-500 mt-1">You have not applied to any bounties yet. Browse the marketplace and start coding!</p>
                    <button
                      onClick={() => setActiveTab('bounties')}
                      className="mt-4 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      Browse Marketplace
                    </button>
                  </div>
                )
              )}
            </div>
          )}
          {activeTab === 'profile' && (
            <div id="panel-profile-onboarding" className="animate-fade-in">
              <h2 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-neutral-900" />
                Customize Profile Configuration
              </h2>

              <form onSubmit={handleSaveProfile} className="space-y-6 text-xs text-neutral-700">
                {/* Onboarding / Role Toggle */}
                <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                  <span className="block font-bold uppercase tracking-wider text-neutral-600 mb-2">
                    Current active platform persona
                  </span>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setRole('BUILDER')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs font-bold border transition-all cursor-pointer ${
                        role === 'BUILDER'
                          ? 'bg-white text-black border-black shadow-sm'
                          : 'bg-neutral-100 text-neutral-500 border-transparent hover:text-neutral-800'
                      }`}
                    >
                      <Code className="h-4 w-4" />
                      Developer / Builder
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setRole('COMPANY')}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-xs font-bold border transition-all cursor-pointer ${
                        role === 'COMPANY'
                          ? 'bg-white text-black border-black shadow-sm'
                          : 'bg-neutral-100 text-neutral-500 border-transparent hover:text-neutral-800'
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      Bounty Creator / Company
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-neutral-500">
                    Switching roles changes your platform dashboard, available tools, and workspace lists.
                  </p>
                </div>

                {/* Primary name and email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Email (Read-only security token)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={currentUser?.email || ''}
                      className="block w-full rounded-lg border border-neutral-100 bg-neutral-50 py-2.5 px-3 text-sm text-neutral-500 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Conditional Fields based on Role Selection */}
                {role === 'COMPANY' ? (
                  <div className="space-y-4 border-t border-neutral-100 pt-4 animate-fade-in">
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                        Company Name / Brand
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acme Automation Labs"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                        Official URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://acme.io"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 border-t border-neutral-100 pt-4 animate-fade-in">
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                        GitHub Integration Profile Username
                      </label>
                      <div className="relative">
                        <Github className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                        <input
                          type="text"
                          required
                          placeholder="github-profile"
                          value={githubUsername}
                          onChange={(e) => setGithubUsername(e.target.value)}
                          className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                        Skills Tag (Comma-separated)
                      </label>
                      <input
                        type="text"
                        placeholder="React, TypeScript, TailWind CSS, Rust"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
                      />
                    </div>
                  </div>
                )}

                {/* Shared bio */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Profile Bio Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide a comprehensive biography to help with peer connections and reviews..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving changes...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'bounties' && (
            <div id="panel-bounties-list" className="animate-fade-in space-y-6">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">
                  {role === 'COMPANY' ? 'Your Posted Bounties' : 'Active Discovery Marketplace'}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {role === 'COMPANY' ? 'Bounties created by you and waiting for solutions.' : 'Explore available development bounties to earn rewards.'}
                </p>
              </div>

              {role === 'COMPANY' ? (
                myBounties.length > 0 ? (
                  <div className="space-y-4">
                    {myBounties.map(b => (
                      <div
                        key={b.id}
                        onClick={() => onNavigate(`detail-${b.id}`)}
                        className="p-4 border border-neutral-200 rounded-xl hover:border-black cursor-pointer transition-colors flex justify-between items-center gap-4 text-xs"
                      >
                        <div>
                          <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-700 border border-neutral-200/50 uppercase tracking-wide mr-2">
                            {b.category}
                          </span>
                          <span className="inline-flex items-center rounded-md bg-black text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {b.status === 'FUNDED' ? 'PUBLISHED' : b.status}
                          </span>
                          <h4 className="text-sm font-bold text-neutral-900 mt-2">{b.title}</h4>
                          <p className="text-neutral-500 line-clamp-1 mt-1 max-w-xl">{b.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="block text-sm font-extrabold text-neutral-900">${b.reward.toLocaleString()}</span>
                          <span className="block text-[10px] text-neutral-400 mt-0.5">Reward Value</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-neutral-200 rounded-xl">
                    <Briefcase className="h-8 w-8 text-neutral-300 mx-auto" />
                    <h4 className="font-bold text-neutral-900 mt-2">No Bounties Created</h4>
                    <p className="text-xs text-neutral-500 mt-1">Ready to find talented builders? Create your first listing now!</p>
                    <button
                      onClick={() => onNavigate('post')}
                      className="mt-4 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      Post First Bounty
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="bg-neutral-50 border border-neutral-100 p-4 rounded-xl text-neutral-700 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold block">Looking for open opportunities?</span>
                      <span className="text-neutral-500 block mt-0.5">Explore the full public Bounty Loop marketplace to claim task requests.</span>
                    </div>
                    <button
                      onClick={() => onNavigate('browse')}
                      className="rounded-lg bg-black text-white font-bold py-2 px-3 hover:bg-neutral-800 transition-colors cursor-pointer shrink-0 whitespace-nowrap ml-4"
                    >
                      Explore Marketplace &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
