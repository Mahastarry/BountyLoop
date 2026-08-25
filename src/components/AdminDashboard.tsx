import React, { useState, useEffect } from 'react';
import { 
  Building, Users, Layers, DollarSign, Clock, Plus, Edit2, 
  CheckCircle, XCircle, AlertCircle, Calendar, Check, ExternalLink, Shield, Save, X
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: any;
  onBack: () => void;
}

const CATEGORIES = [
  'Frontend',
  'Backend',
  'Fullstack',
  'Security',
  'AI / Machine Learning',
  'DevOps & Scalability'
];

export default function AdminDashboard({ currentUser, onBack }: AdminDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [bounties, setBounties] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'bounties' | 'applications' | 'creators' | 'developers' | 'payments'>('bounties');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [editingBounty, setEditingBounty] = useState<any | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [showAddBountyForm, setShowAddBountyForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [payoutSuccessData, setPayoutSuccessData] = useState<{ amount: number; bountyTitle: string } | null>(null);

  // New bounty form inputs
  const [newBountyTitle, setNewBountyTitle] = useState('');
  const [newBountyDesc, setNewBountyDesc] = useState('');
  const [newBountyReward, setNewBountyReward] = useState('1000');
  const [newBountyCategory, setNewBountyCategory] = useState(CATEGORIES[0]);
  const [newBountyCompany, setNewBountyCompany] = useState('');
  const [newBountyDeadline, setNewBountyDeadline] = useState('');
  const [newBountyRequirements, setNewBountyRequirements] = useState('');
  const [newBountyTech, setNewBountyTech] = useState('');
  const [newBountyCriteria, setNewBountyCriteria] = useState('');

  // Fetch admin data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('bountyloop_auth_token');
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const [statsRes, bountiesRes, appsRes, creatorsRes, devsRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/admin/bounties', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/admin/applications', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/admin/creators', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/admin/developers', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/admin/payments', { headers }).then(r => r.ok ? r.json() : [])
      ]);

      if (statsRes) {
        setStats(statsRes);
      } else {
        throw new Error('Could not retrieve admin session. Confirm role authorization.');
      }

      setBounties(bountiesRes);
      setApplications(appsRes);
      setCreators(creatorsRes);
      setDevelopers(devsRes);
      setPayments(paymentsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrative modules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update bounty status
  const handleUpdateBountyStatus = async (bountyId: string, status: string, paymentStatus?: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('bountyloop_auth_token');
      const res = await fetch(`/api/admin/bounties/${bountyId}/status`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, paymentStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Create new bounty manually
  const handleCreateBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBountyTitle || !newBountyDesc || !newBountyReward) {
      alert('Required fields are missing.');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('bountyloop_auth_token');
      const res = await fetch('/api/admin/bounties', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newBountyTitle,
          description: newBountyDesc,
          category: newBountyCategory,
          reward: parseFloat(newBountyReward),
          companyName: newBountyCompany || 'Google Form Submitter',
          deadline: newBountyDeadline || undefined,
          requirements: newBountyRequirements || undefined,
          technology: newBountyTech || undefined,
          acceptanceCriteria: newBountyCriteria || undefined
        })
      });

      if (!res.ok) throw new Error('Failed to add listing');
      
      // Reset
      setNewBountyTitle('');
      setNewBountyDesc('');
      setNewBountyReward('1000');
      setNewBountyCompany('');
      setNewBountyDeadline('');
      setNewBountyRequirements('');
      setNewBountyTech('');
      setNewBountyCriteria('');
      setShowAddBountyForm(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit bounty details
  const handleSaveBountyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem('bountyloop_auth_token');
      const res = await fetch(`/api/admin/bounties/${editingBounty.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingBounty)
      });
      if (!res.ok) throw new Error('Failed to save changes');
      setEditingBounty(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Application (Developer Claim) Status
  const handleUpdateAppStatus = async (appId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('bountyloop_auth_token');
      const res = await fetch(`/api/admin/applications/${appId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update developer assignment');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Save manual payment recording
  const handleSavePaymentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem('bountyloop_auth_token');
      const res = await fetch(`/api/admin/payments/${editingPayment.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fundingStatus: editingPayment.fundingStatus,
          payoutStatus: editingPayment.payoutStatus,
          paymentDate: editingPayment.paymentDate,
          payoutDate: editingPayment.payoutDate
        })
      });
      if (!res.ok) throw new Error('Failed to record manual payments');
      
      const savedPayment = editingPayment;
      setEditingPayment(null);
      await fetchData();

      // Transition to payout success page if marked as PAID / COMPLETE
      if (savedPayment.payoutStatus === 'PAID') {
        setPayoutSuccessData({
          amount: savedPayment.developerPayout,
          bountyTitle: savedPayment.bountyTitle
        });
      }
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (payoutSuccessData) {
    const tweetText = `Just completed a software bounty through BountyLoop and earned $${payoutSuccessData.amount.toLocaleString()} for solving a real technical challenge. 🚀`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center font-sans">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm space-y-6">
          <div className="mx-auto h-12 w-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Payout Successfully Recorded</h1>
            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">{payoutSuccessData.bountyTitle}</p>
          </div>

          <div className="p-6 bg-neutral-50/50 rounded-xl border border-neutral-100">
            <span className="text-xs text-neutral-500 font-medium">Developer Net Yield Payout</span>
            <div className="text-4xl font-black text-emerald-800 mt-1">
              ${payoutSuccessData.amount.toLocaleString()}
            </div>
            <p className="text-[10px] text-neutral-400 mt-2">
              Note: Payout has been recorded manually in the ledger. Real instant transfers remain disabled. Payments are cleared manually.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.open(tweetUrl, '_blank', 'noopener,noreferrer')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X (Twitter)
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setPayoutSuccessData(null)}
                className="flex-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 px-3 py-2.5 text-xs font-semibold text-neutral-700 cursor-pointer transition-colors"
              >
                Return to Admin
              </button>
              
              <button
                onClick={() => {
                  setPayoutSuccessData(null);
                  onBack();
                }}
                className="flex-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 px-3 py-2.5 text-xs font-semibold text-neutral-700 cursor-pointer transition-colors"
              >
                Browse Bounties
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-24 text-center font-sans">
        <Clock className="h-8 w-8 animate-spin text-neutral-400 mx-auto mb-4" />
        <p className="text-sm font-semibold text-neutral-600">Retrieving operational records...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-100 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-red-50 border border-red-100 text-red-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
              <Shield className="h-3 w-3" /> Secure Admin Session
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 mt-1">BountyLoop Admin Control</h1>
          <p className="text-sm text-neutral-500 mt-1">Review listings, assign builders, verify solutions, and record manual ledger transactions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Exit Control Room
          </button>
          <button
            onClick={() => setShowAddBountyForm(true)}
            className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Import Google Form Response
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Operational Key Metrics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Listings</span>
            <div className="text-2xl font-black text-neutral-900 mt-1">{stats.totalBounties}</div>
            <span className="text-[10px] text-neutral-500 font-medium">Bounties recorded in db</span>
          </div>

          <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pending Form Submissions</span>
            <div className="text-2xl font-black text-amber-700 mt-1">{stats.pendingSubmissions}</div>
            <span className="text-[10px] text-neutral-500 font-medium">Require review & approval</span>
          </div>

          <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Funded & Live Bounties</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.fundedBounties}</div>
            <span className="text-[10px] text-neutral-500 font-medium">Visible to the public market</span>
          </div>

          <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Bounty Value Assigned</span>
            <div className="text-2xl font-black text-blue-800 mt-1">${stats.totalBountyValue.toLocaleString()}</div>
            <span className="text-[10px] text-neutral-500 font-medium">Total pools committed</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-neutral-200 mb-6">
        <nav className="flex space-x-6">
          {(['bounties', 'applications', 'creators', 'developers', 'payments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-black text-black' 
                  : 'border-transparent text-neutral-400 hover:text-neutral-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-neutral-200/60 rounded-xl overflow-hidden shadow-sm">
        
        {/* BOUNTIES PANEL */}
        {activeTab === 'bounties' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100 text-left text-xs">
              <thead className="bg-neutral-50 font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">ID & Title</th>
                  <th className="px-6 py-4">Host / Company</th>
                  <th className="px-6 py-4">Reward</th>
                  <th className="px-6 py-4">Platform Fee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {bounties.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-bold text-neutral-900 line-clamp-1">{b.title}</div>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">{b.id} ({b.category})</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-neutral-900">
                      {b.companyName || 'Google Form Submitter'}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-neutral-900">${b.reward.toLocaleString()}</td>
                    <td className="px-6 py-4 text-neutral-500">${b.platformFee.toLocaleString()} (6.6%)</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                        b.status === 'PENDING REVIEW' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                        b.status === 'APPROVED' ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' :
                        b.status === 'FUNDED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                        b.status === 'IN PROGRESS' ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                        b.status === 'SUBMITTED' ? 'bg-purple-50 text-purple-800 border border-purple-100' :
                        b.status === 'COMPLETED' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        b.paymentStatus === 'FUNDED' ? 'bg-emerald-50 text-emerald-700' :
                        b.paymentStatus === 'PAID' ? 'bg-neutral-900 text-white' :
                        'bg-neutral-100 text-neutral-500'
                      }`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setEditingBounty(b)}
                        className="text-neutral-500 hover:text-neutral-900 p-1"
                        title="Edit details"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {b.status === 'PENDING REVIEW' && (
                        <button
                          onClick={() => handleUpdateBountyStatus(b.id, 'APPROVED')}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded"
                        >
                          Approve
                        </button>
                      )}

                      {b.status === 'APPROVED' && (
                        <button
                          onClick={() => handleUpdateBountyStatus(b.id, 'FUNDED', 'FUNDED')}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded"
                        >
                          Mark Funded
                        </button>
                      )}

                      {b.status === 'SUBMITTED' && (
                        <button
                          onClick={() => handleUpdateBountyStatus(b.id, 'COMPLETED', 'PAID')}
                          className="bg-black hover:bg-neutral-800 text-white text-[10px] font-bold px-2 py-1 rounded"
                        >
                          Complete Bounty
                        </button>
                      )}

                      {b.status !== 'CLOSED' && b.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleUpdateBountyStatus(b.id, 'CLOSED')}
                          className="bg-neutral-50 hover:bg-neutral-100 text-neutral-600 text-[10px] font-bold px-2 py-1 rounded"
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* APPLICATIONS PANEL */}
        {activeTab === 'applications' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100 text-left text-xs">
              <thead className="bg-neutral-50 font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Bounty Target</th>
                  <th className="px-6 py-4">Developer</th>
                  <th className="px-6 py-4">GitHub Profile</th>
                  <th className="px-6 py-4">Statement of Interest / Bio</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4 font-bold text-neutral-900 max-w-xs truncate">
                      {app.bountyTitle}
                      <div className="text-[10px] font-mono text-neutral-400 font-normal mt-0.5">Bounty ID: {app.bountyId}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-neutral-900">
                      {app.developerName}
                      <div className="text-[10px] text-neutral-400 font-normal mt-0.5">{app.developerEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`https://github.com/${app.githubUsername}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-neutral-900 hover:underline"
                      >
                        @{app.githubUsername} <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4 max-w-sm truncate text-neutral-500" title={app.bio}>
                      {app.bio || 'No statement submitted.'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        app.status === 'PENDING' ? 'bg-amber-50 text-amber-800' :
                        app.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                        'bg-red-50 text-red-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {app.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleUpdateAppStatus(app.id, 'APPROVED')}
                            className="bg-black hover:bg-neutral-800 text-white text-[10px] font-bold px-2 py-1 rounded"
                          >
                            Assign / Select
                          </button>
                          <button
                            onClick={() => handleUpdateAppStatus(app.id, 'REJECTED')}
                            className="bg-neutral-50 hover:bg-neutral-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 font-medium">
                      No applications currently requested on active funded bounties.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CREATORS PANEL */}
        {activeTab === 'creators' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100 text-left text-xs">
              <thead className="bg-neutral-50 font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Company Name</th>
                  <th className="px-6 py-4">Website</th>
                  <th className="px-6 py-4">Contact Profile</th>
                  <th className="px-6 py-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {creators.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4 font-bold text-neutral-900">{c.companyName}</td>
                    <td className="px-6 py-4 text-neutral-500">{c.websiteUrl || 'Not specified'}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-neutral-900">{c.contactName || 'Anonymous'}</div>
                      <div className="text-[10px] text-neutral-400">{c.contactEmail || 'No Email'}</div>
                    </td>
                    <td className="px-6 py-4 text-neutral-500 max-w-sm truncate">{c.description || 'No summary bio.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DEVELOPERS PANEL */}
        {activeTab === 'developers' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100 text-left text-xs">
              <thead className="bg-neutral-50 font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">GitHub Profile</th>
                  <th className="px-6 py-4">Primary Skills</th>
                  <th className="px-6 py-4">Bio / Resume Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {developers.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4 font-bold text-neutral-900">{d.fullName}</td>
                    <td className="px-6 py-4">
                      <a 
                        href={`https://github.com/${d.githubUsername}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-neutral-900 hover:underline"
                      >
                        @{d.githubUsername} <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4 font-semibold text-indigo-700">{d.skills?.join(', ') || 'Not declared'}</td>
                    <td className="px-6 py-4 text-neutral-500 max-w-sm truncate">{d.bio || 'No profile summary.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAYMENTS PANEL */}
        {activeTab === 'payments' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100 text-left text-xs">
              <thead className="bg-neutral-50 font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Bounty Target</th>
                  <th className="px-6 py-4">Assigned Developer</th>
                  <th className="px-6 py-4">Gross Reward</th>
                  <th className="px-6 py-4">6.6% platform fee</th>
                  <th className="px-6 py-4">Builder Net Payout</th>
                  <th className="px-6 py-4">Funding State</th>
                  <th className="px-6 py-4">Payout State</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4 font-bold text-neutral-900 max-w-xs truncate">
                      {p.bountyTitle}
                      <div className="text-[10px] font-mono text-neutral-400 font-normal mt-0.5">Bounty ID: {p.bountyId}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-neutral-900">{p.developerName}</td>
                    <td className="px-6 py-4 font-extrabold text-neutral-900">${p.reward.toLocaleString()}</td>
                    <td className="px-6 py-4 text-neutral-500">${p.platformFee.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-emerald-800">${p.developerPayout.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.fundingStatus === 'FUNDED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800'
                      }`}>
                        {p.fundingStatus}
                      </span>
                      {p.paymentDate && (
                        <div className="text-[9px] text-neutral-400 mt-0.5">Paid: {p.paymentDate}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.payoutStatus === 'PAID' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {p.payoutStatus}
                      </span>
                      {p.payoutDate && (
                        <div className="text-[9px] text-neutral-400 mt-0.5">Cleared: {p.payoutDate}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditingPayment(p)}
                        className="text-neutral-500 hover:text-black p-1"
                        title="Edit ledger record"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE BOUNTY MODAL */}
      {showAddBountyForm && (
        <div className="fixed inset-0 z-50 bg-neutral-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
              <h2 className="text-xl font-extrabold text-neutral-900">Import Google Form Listing</h2>
              <button 
                onClick={() => setShowAddBountyForm(false)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBounty} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Company / Organization Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={newBountyCompany}
                  onChange={e => setNewBountyCompany(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Bounty Title</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Optimize React Virtual Scroll Lag"
                    value={newBountyTitle}
                    onChange={e => setNewBountyTitle(e.target.value)}
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Category</label>
                  <select 
                    value={newBountyCategory}
                    onChange={e => setNewBountyCategory(e.target.value)}
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Gross Reward committed ($)</label>
                  <input 
                    type="number"
                    required
                    min={100}
                    placeholder="e.g. 1000"
                    value={newBountyReward}
                    onChange={e => setNewBountyReward(e.target.value)}
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                  <div className="text-[10px] text-neutral-400 mt-1">
                    Net Developer payout: ${(parseFloat(newBountyReward || '0') * 0.934).toLocaleString(undefined, {maximumFractionDigits:0})} (6.6% fee)
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Target Submission Deadline</label>
                  <input 
                    type="date"
                    value={newBountyDeadline}
                    onChange={e => setNewBountyDeadline(e.target.value)}
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Bounty Description</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Summarize the core technical problem..."
                  value={newBountyDesc}
                  onChange={e => setNewBountyDesc(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Technical Stack Requirements</label>
                <input 
                  type="text"
                  placeholder="e.g. React, Webpack, Virtualization, TypeScript"
                  value={newBountyTech}
                  onChange={e => setNewBountyTech(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Deliverables & Detailed Requirements</label>
                <textarea 
                  rows={2}
                  placeholder="Define precise deliverables..."
                  value={newBountyRequirements}
                  onChange={e => setNewBountyRequirements(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Acceptance Criteria</label>
                <textarea 
                  rows={2}
                  placeholder="What must be true to verify the solution?"
                  value={newBountyCriteria}
                  onChange={e => setNewBountyCriteria(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddBountyForm(false)}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {actionLoading ? 'Saving...' : 'Add as Pending Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BOUNTY MODAL */}
      {editingBounty && (
        <div className="fixed inset-0 z-50 bg-neutral-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
              <h2 className="text-xl font-extrabold text-neutral-900">Edit Bounty Details</h2>
              <button 
                onClick={() => setEditingBounty(null)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBountyEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Company / Organization Name</label>
                <input 
                  type="text"
                  required
                  value={editingBounty.companyName || ''}
                  onChange={e => setEditingBounty({ ...editingBounty, companyName: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Bounty Title</label>
                  <input 
                    type="text"
                    required
                    value={editingBounty.title}
                    onChange={e => setEditingBounty({ ...editingBounty, title: e.target.value })}
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Category</label>
                  <select 
                    value={editingBounty.category}
                    onChange={e => setEditingBounty({ ...editingBounty, category: e.target.value })}
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Gross Reward ($)</label>
                  <input 
                    type="number"
                    required
                    value={editingBounty.reward}
                    onChange={e => setEditingBounty({ ...editingBounty, reward: parseFloat(e.target.value) })}
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Deadline Date</label>
                  <input 
                    type="date"
                    value={editingBounty.deadline}
                    onChange={e => setEditingBounty({ ...editingBounty, deadline: e.target.value })}
                    className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Bounty Description</label>
                <textarea 
                  required
                  rows={3}
                  value={editingBounty.description}
                  onChange={e => setEditingBounty({ ...editingBounty, description: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Technical Stack Requirements</label>
                <input 
                  type="text"
                  value={editingBounty.technology || ''}
                  onChange={e => setEditingBounty({ ...editingBounty, technology: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Detailed Requirements</label>
                <textarea 
                  rows={2}
                  value={editingBounty.requirements || ''}
                  onChange={e => setEditingBounty({ ...editingBounty, requirements: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Acceptance Criteria</label>
                <textarea 
                  rows={2}
                  value={editingBounty.acceptanceCriteria || ''}
                  onChange={e => setEditingBounty({ ...editingBounty, acceptanceCriteria: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingBounty(null)}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:bg-neutral-400"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT RECORD MODAL */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 bg-neutral-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
              <h2 className="text-xl font-extrabold text-neutral-900">Record Manual Payment</h2>
              <button 
                onClick={() => setEditingPayment(null)}
                className="text-neutral-400 hover:text-black p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentEdit} className="space-y-4">
              <div>
                <div className="text-xs text-neutral-500 mb-2">
                  Verify wire, stripe checkout, or cash funding from host. Record the payout once clearing satisfies testing.
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-lg text-xs mb-4">
                  <div className="font-bold text-neutral-900 mb-1">{editingPayment.bountyTitle}</div>
                  <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-[10px]">
                    <div>
                      <span className="text-neutral-400">Gross Pool:</span>
                      <div className="font-bold text-neutral-800">${editingPayment.reward}</div>
                    </div>
                    <div>
                      <span className="text-neutral-400">6.6% Fee:</span>
                      <div className="font-bold text-neutral-800">${editingPayment.platformFee}</div>
                    </div>
                    <div>
                      <span className="text-neutral-400">Net Payout:</span>
                      <div className="font-bold text-emerald-800">${editingPayment.developerPayout}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Funding Status (From Creator)</label>
                <select 
                  value={editingPayment.fundingStatus}
                  onChange={e => setEditingPayment({ ...editingPayment, fundingStatus: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none animate-none"
                >
                  <option value="UNFUNDED">UNFUNDED</option>
                  <option value="FUNDED">FUNDED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Funding Transaction Date</label>
                <input 
                  type="date"
                  value={editingPayment.paymentDate || ''}
                  onChange={e => setEditingPayment({ ...editingPayment, paymentDate: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Payout Status (To Builder)</label>
                <select 
                  value={editingPayment.payoutStatus}
                  onChange={e => setEditingPayment({ ...editingPayment, payoutStatus: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none animate-none"
                >
                  <option value="UNPAID">UNPAID / OUTSTANDING</option>
                  <option value="PAID">PAID / COMPLETE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Payout Clearing Date</label>
                <input 
                  type="date"
                  value={editingPayment.payoutDate || ''}
                  onChange={e => setEditingPayment({ ...editingPayment, payoutDate: e.target.value })}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  {actionLoading ? 'Recording...' : 'Record Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
