import { useState, FormEvent } from 'react';
import { 
  ArrowLeft, Calendar, Building, DollarSign, Tag, Info, AlertTriangle, 
  CheckCircle2, Link as LinkIcon, User, Mail, FileText, Send, Check, 
  ShieldCheck, ShieldAlert, Award, Clock, Activity, Github 
} from 'lucide-react';
import { api } from '../lib/api';

interface BountyDetailProps {
  bounty: any;
  onBack: () => void;
  solutions: any[];
  claims: any[];
  auditTrail: any[];
  currentUser: any;
  onClaim: (claimData: { message: string; experience: string }) => Promise<void>;
  onApproveClaim: (claimId: string) => Promise<void>;
  onApproveSubmission: (submissionId: string) => Promise<void>;
  onAddSolution: (newSolution: { githubUrl: string; demoUrl?: string; description: string }) => Promise<void>;
  onRejectSubmission: (reason: string) => Promise<void>;
  onConfirmPaymentDeposited: () => Promise<void>;
}

export default function BountyDetail({ 
  bounty, 
  onBack, 
  solutions = [], 
  claims = [], 
  auditTrail = [], 
  currentUser,
  onClaim,
  onApproveClaim,
  onApproveSubmission,
  onAddSolution,
  onRejectSubmission,
  onConfirmPaymentDeposited
}: BountyDetailProps) {
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [description, setDescription] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [copiedGh, setCopiedGh] = useState(false);

  // New Application States
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyExperience, setApplyExperience] = useState('');

  // New Rejection States
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const getShareUrl = () => {
    const siteUrl = (window as any).NEXT_PUBLIC_SITE_URL || window.location.origin;
    return `${siteUrl}/bounties/${bounty.id}`;
  };

  const handleCopyLink = () => {
    const shareUrl = getShareUrl();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyGhLink = () => {
    const shareUrl = getShareUrl();
    navigator.clipboard.writeText(shareUrl);
    setCopiedGh(true);
    setTimeout(() => setCopiedGh(false), 2000);
  };

  const handleShareX = () => {
    const shareUrl = getShareUrl();
    const text = `Check out this technical bounty on BountyLoop: Fix "${bounty.title}" for a reward of $${bounty.reward.toLocaleString()}. Let's solve it! 🚀`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(xUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = () => {
    const shareUrl = getShareUrl();
    if (navigator.share) {
      navigator.share({
        title: `$${bounty.reward.toLocaleString()} Bounty: Fix ${bounty.title} | BountyLoop`,
        text: `Solve this technical bounty on BountyLoop: "${bounty.title}"`,
        url: shareUrl,
      }).catch((err) => console.error('Share failed', err));
    }
  };

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const platformFee = bounty.reward * 0.066;
  const netPayout = bounty.reward - platformFee;

  // Find if current user has already claimed
  const myClaim = currentUser
    ? claims.find((c) => c.builderId === currentUser.id || c.userId === currentUser.id)
    : null;

  // Determine if user can submit solution
  // Builders can submit if they have an approved claim
  const isApprovedBuilder = currentUser && currentUser.role === 'BUILDER' && 
    claims.some((c) => c.status === 'APPROVED' && (c.builderId === currentUser.id || c.userId === currentUser.id));

  const isBountyOwner = currentUser && currentUser.role === 'COMPANY' && bounty.companyId; 

  const handleClaimRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!applyMessage.trim() || !applyExperience.trim()) {
      setActionError('Statement of interest and relevant experience are required.');
      return;
    }
    setActionError(null);
    setActionLoading(true);
    try {
      await onClaim({ message: applyMessage, experience: applyExperience });
      setShowApplyForm(false);
      setApplyMessage('');
      setApplyExperience('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit claim request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveClaimRequest = async (claimId: string) => {
    setActionError(null);
    setActionLoading(true);
    try {
      await onApproveClaim(claimId);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve claim.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWinnerSelection = async (submissionId: string) => {
    setActionError(null);
    setActionLoading(true);
    try {
      await onApproveSubmission(submissionId);
    } catch (err: any) {
      setActionError(err.message || 'Failed to select winner.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChangesSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setActionError('rejection reason is required.');
      return;
    }
    setActionError(null);
    setActionLoading(true);
    try {
      await onRejectSubmission(rejectionReason);
      setShowRejectionForm(false);
      setRejectionReason('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to request changes.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmFunding = async () => {
    setActionError(null);
    setActionLoading(true);
    try {
      await onConfirmPaymentDeposited();
    } catch (err: any) {
      setActionError(err.message || 'Failed to report payment.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Submission Validation & Callback
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!githubUrl.trim()) {
      newErrors.githubUrl = 'Repository or PR URL is required.';
    } else if (!/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(githubUrl)) {
      newErrors.githubUrl = 'Please enter a valid URL (e.g. https://github.com/username/project).';
    }

    if (!description.trim() || description.length < 50) {
      newErrors.description = 'Provide a description of at least 50 characters detailing your solution.';
    }

    if (demoUrl.trim()) {
      if (!/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(demoUrl)) {
        newErrors.demoUrl = 'Please enter a valid deployment URL (e.g. https://myproject.com).';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setActionError(null);
    setActionLoading(true);
    try {
      await onAddSolution({
        githubUrl,
        demoUrl: demoUrl.trim() || undefined,
        description
      });
      setErrors({});
      setSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setGithubUrl('');
        setDemoUrl('');
        setDescription('');
        setSuccess(false);
        setShowSubmitForm(false);
      }, 2500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit solution.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div id={`bounty-detail-view-${bounty.id}`} className="mx-auto max-w-7xl px-6 py-12 lg:px-8 font-sans">
      {/* Navigation breadcrumb */}
      <button
        id="btn-back-to-list"
        onClick={onBack}
        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-black cursor-pointer transition-colors"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to bounties
      </button>

      {/* Action error flash */}
      {actionError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
          {actionError}
        </div>
      )}

      {/* Main Grid: Details Left, Financial Card Right */}
      <div id="detail-layout" className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
        {/* Left: Core Information */}
        <div className="lg:col-span-8 space-y-10">
          <div id="detail-meta-header">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center rounded-md bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800 border border-neutral-200/50">
                <Tag className="mr-1 h-3.5 w-3.5" />
                {bounty.category}
              </span>
              
              <span className="inline-flex items-center rounded-md bg-neutral-900 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                Bounty status: {bounty.status === 'FUNDED' ? 'PUBLISHED' : bounty.status}
              </span>

              <span className="inline-flex items-center rounded-md bg-blue-50 text-blue-800 px-3 py-1 text-xs font-semibold border border-blue-200/50 uppercase">
                Payment: {(bounty.paymentStatus === 'FUNDED' || bounty.paymentStatus === 'PAID') ? 'FUNDED' : 'UNFUNDED'}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
              {bounty.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-neutral-500 border-b border-neutral-100 pb-6">
              <span className="flex items-center gap-1.5 font-semibold text-neutral-800">
                <Building className="h-4 w-4 text-neutral-400" />
                {bounty.companyName || bounty.company}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-neutral-400" />
                Created: {bounty.createdAt}
              </span>
              {bounty.githubRepoUrl ? (
                <div className="flex flex-col gap-3 w-full mt-4 border-t border-neutral-100 pt-4">
                  <a
                    href={bounty.githubRepoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 hover:underline text-neutral-900 font-semibold text-sm"
                  >
                    <Github className="h-4 w-4 text-neutral-600" />
                    GitHub Integration Configured
                  </a>
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60 max-w-lg">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                      <Github className="h-4 w-4 text-neutral-500" />
                      Shareable Link for GitHub Issue
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Copy and paste this link in your GitHub issue to let developers discover this bounty and apply on BountyLoop:
                    </p>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        readOnly
                        value={getShareUrl()}
                        className="flex-1 min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-700 select-all outline-none"
                      />
                      <button
                        onClick={handleCopyGhLink}
                        className="rounded-lg bg-black hover:bg-neutral-800 px-3 py-1.5 text-xs font-bold text-white whitespace-nowrap cursor-pointer transition-colors"
                      >
                        {copiedGh ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1.5 italic">
                      BountyLoop link architecture prepared. Auto-posting webhook logs initialized.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Description Block */}
          <div id="detail-description" className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Scope and Objectives</h2>
            <p className="text-base text-neutral-600 leading-relaxed whitespace-pre-line">
              {bounty.description}
            </p>
          </div>

          {/* Builder claim requests (For Company to view, or Builder status update) */}
          {claims.length > 0 && (
            <div id="detail-claims" className="border-t border-neutral-100 pt-8 space-y-4">
              <h2 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                <Clock className="h-5 w-5 text-neutral-500" />
                Claim Applications ({claims.length})
              </h2>

              <div className="grid grid-cols-1 gap-3">
                {claims.map((claim) => (
                  <div key={claim.id} className="flex flex-col md:flex-row md:items-start md:justify-between p-5 rounded-xl border border-neutral-100 bg-neutral-50/50 gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900">Application by {claim.developerName}</span>
                        <a
                          href={`https://github.com/${claim.githubUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-neutral-500 hover:text-black font-semibold"
                        >
                          <Github className="h-3 w-3" />
                          @{claim.githubUsername}
                        </a>
                      </div>
                      
                      <div className="text-xs text-neutral-600 space-y-1.5">
                        <p><strong>Email Address:</strong> <a href={`mailto:${claim.developerEmail}`} className="text-neutral-900 hover:underline">{claim.developerEmail}</a></p>
                        {claim.message && (
                          <div className="mt-2 bg-white p-3 rounded-lg border border-neutral-100">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Statement of Interest:</span>
                            <p className="text-neutral-700 leading-relaxed font-sans text-xs italic">"{claim.message}"</p>
                          </div>
                        )}
                        {claim.experience && (
                          <div className="mt-2 bg-white p-3 rounded-lg border border-neutral-100">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Relevant Experience:</span>
                            <p className="text-neutral-700 leading-relaxed font-sans text-xs">{claim.experience}</p>
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-neutral-400">Filed: {new Date(claim.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-start">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                        claim.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        claim.status === 'REJECTED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {claim.status}
                      </span>

                      {/* Approve claims button - only show if current user is owner, claim is pending, and bounty is published/funded */}
                      {isBountyOwner && claim.status === 'PENDING' && (bounty.status === 'PUBLISHED' || bounty.status === 'FUNDED') && (
                        <button
                          onClick={() => handleApproveClaimRequest(claim.id)}
                          disabled={actionLoading}
                          className="rounded-lg bg-black px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          Approve Claim
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submitted Solutions List */}
          <div id="detail-submissions" className="border-t border-neutral-100 pt-8 space-y-4">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <Award className="h-5 w-5 text-neutral-500" />
              Solutions Competing ({solutions.length})
            </h2>
            
            {solutions.length > 0 ? (
              <div className="space-y-4">
                {solutions.map((sol) => {
                  const isWinner = bounty.status === 'COMPLETED' || bounty.status === 'PAID';
                  
                  return (
                    <div key={sol.id} className={`rounded-xl border p-5 space-y-3 relative ${
                      isWinner ? 'border-amber-200 bg-amber-50/20' : 'border-neutral-100 bg-neutral-50/50'
                    }`}>
                      {isWinner && (
                        <span className="absolute top-4 right-4 flex items-center gap-1 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border border-amber-200">
                          <Check className="h-3 w-3" />
                          Winning Submission
                        </span>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-sm text-neutral-900">{sol.name || 'Anonymous Builder'}</span>
                          <span className="text-xs text-neutral-400 ml-2">
                            submitted {new Date(sol.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <a
                            href={sol.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:underline"
                          >
                            <LinkIcon className="h-3 w-3" />
                            Code Link
                          </a>
                          {sol.demoUrl && (
                            <a
                              href={sol.demoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:underline"
                            >
                              <Building className="h-3 w-3" />
                              Live Demo
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                        {sol.description}
                      </p>

                      {/* Select Winner & Request Changes Buttons */}
                      {isBountyOwner && bounty.status === 'SUBMITTED' && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-100">
                          <button
                            onClick={() => {
                              setShowRejectionForm(!showRejectionForm);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 text-red-800 px-3.5 py-1.5 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                          >
                            Request Changes
                          </button>

                          <button
                            onClick={() => handleWinnerSelection(sol.id)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 rounded-lg bg-black px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve Completed Work
                          </button>
                        </div>
                      )}

                      {/* Request Changes Form */}
                      {showRejectionForm && isBountyOwner && bounty.status === 'SUBMITTED' && (
                        <form onSubmit={handleRequestChangesSubmit} className="mt-4 p-4 rounded-xl border border-red-200 bg-red-50/20 space-y-3">
                          <label className="block text-xs font-bold uppercase tracking-wider text-red-800">
                            Requested Changes / Feedback
                          </label>
                          <textarea
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Detail exactly what changes or fixes the developer needs to perform to make this submission successful..."
                            className="block w-full rounded-lg border border-red-200 bg-white p-2.5 text-xs text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-red-500"
                          ></textarea>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowRejectionForm(false)}
                              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={actionLoading}
                              className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-red-700 transition-colors"
                            >
                              Send Changes Request
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">
                No solutions have been submitted yet. Review the requirements and be the first to submit code!
              </p>
            )}
          </div>

          {/* Audit trail history log (Always show details of state updates) */}
          {auditTrail.length > 0 && (
            <div id="detail-audit-trail" className="border-t border-neutral-100 pt-8 space-y-4">
              <h2 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                <Activity className="h-5 w-5 text-neutral-500" />
                Bounty Audit trail logs
              </h2>
              <div className="rounded-xl border border-neutral-100 p-4 space-y-3 bg-neutral-50/30">
                {auditTrail.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs leading-normal">
                    <span className="shrink-0 bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider text-[9px]">
                      {log.eventType}
                    </span>
                    <div className="flex-1">
                      <span className="text-neutral-700">{log.details}</span>
                      <span className="block text-[10px] text-neutral-400 mt-0.5">
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Payment structure card & Call to Actions */}
        <div id="financial-card-container" className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Bounty Reward Structure</h3>
            
            <div className="mt-4 flex items-baseline gap-1 border-b border-neutral-100 pb-5">
              <span className="text-3xl font-extrabold tracking-tight text-neutral-900">${bounty.reward.toLocaleString()}</span>
              <span className="text-xs text-neutral-400 font-semibold">USD</span>
            </div>

            {/* Price Fee Deductions */}
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-neutral-500">
                <span>Total Reward Amount</span>
                <span className="text-neutral-900 font-semibold">${bounty.reward.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>6.6% platform fee</span>
                <span className="text-neutral-900 font-semibold">-${platformFee.toLocaleString()}</span>
              </div>
              <hr className="border-neutral-100" />
              <div className="flex justify-between font-bold text-neutral-900">
                <span>Builder Net Yield</span>
                <span className="text-emerald-700">${netPayout.toLocaleString()}</span>
              </div>
            </div>

            {/* Claim / Submit Actions */}
            <div className="mt-6 space-y-4">
              {/* If builder has not signed in */}
              {!currentUser && (
                <div className="p-3 text-xs text-neutral-500 bg-neutral-50 border border-neutral-100 rounded-lg leading-relaxed">
                  Connect your profile using the header actions to claim this bounty or submit your solution for technical review.
                </div>
              )}

              {/* Creator Funding Card Widget (APPROVED but UNFUNDED) */}
              {isBountyOwner && bounty.paymentStatus === 'UNFUNDED' && bounty.status === 'APPROVED' && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 text-xs space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    Bounty Approved! Escrow Funding Required
                  </div>
                  <p className="text-neutral-600 leading-relaxed">
                    To publish this bounty on the public explore marketplace, please fund the escrow for this bounty.
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-neutral-200 space-y-1.5 font-mono text-[11px] text-neutral-700">
                    <div><strong>Bounty Reward:</strong> ${bounty.reward.toLocaleString()}</div>
                    <div><strong>Platform Fee (6.6%):</strong> ${platformFee.toLocaleString()}</div>
                    <div className="border-t border-neutral-100 pt-1.5 font-bold text-neutral-900"><strong>Total Funding Due:</strong> ${(bounty.reward + platformFee).toLocaleString()} USD</div>
                  </div>
                  <div className="text-[10px] text-neutral-500 bg-white p-2.5 rounded-lg border border-neutral-100">
                    <span className="font-bold text-neutral-800 block mb-1">Razorpay Escrow Transfer Destination:</span>
                    Account Name: BountyLoop Tech Escrow<br />
                    UPI / ID: escrow@bountyloop.razorpay<br />
                    Bank Ref: RAZOR-{bounty.id.substring(0, 8)}
                  </div>
                  <button
                    onClick={handleConfirmFunding}
                    disabled={actionLoading}
                    className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    {actionLoading ? 'Verifying...' : 'Verify Deposit via Razorpay Simulator'}
                  </button>
                </div>
              )}

              {/* Creator Funding Card Widget (APPROVED but Pending Admin verification) */}
              {isBountyOwner && bounty.paymentStatus === 'FUNDING_PENDING' && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Clock className="h-4 w-4" />
                    Funding verification requested
                  </div>
                  <p className="text-neutral-700 leading-relaxed">
                    You have successfully reported deposit sent via Razorpay simulator. The BountyLoop admin is currently verifying that UPI / Bank payment transfer was received.
                  </p>
                  <div className="text-[10px] text-neutral-500 font-semibold italic">
                    Funding State: Awaiting manual admin clearance.
                  </div>
                </div>
              )}

              {/* Developer is viewing a bounty which is approved but unfunded */}
              {currentUser && currentUser.role === 'BUILDER' && bounty.paymentStatus !== 'FUNDED' && (
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-xs text-neutral-500 leading-relaxed">
                  <strong>Bounty status: Approved (Unfunded)</strong>
                  <p className="mt-1">The creator has not completed the payment escrow process yet. Claiming will become active immediately once funding is verified.</p>
                </div>
              )}

              {/* Claim Application Button & Form for Builder (Only if bounty is funded/published) */}
              {currentUser && currentUser.role === 'BUILDER' && (bounty.status === 'PUBLISHED' || bounty.status === 'FUNDED') && !myClaim && (
                <div className="space-y-3">
                  {showApplyForm ? (
                    <form onSubmit={handleClaimRequestSubmit} className="p-4 border border-neutral-200 rounded-xl space-y-3 bg-neutral-50/30">
                      <div className="border-b border-neutral-100 pb-2 mb-2">
                        <span className="block text-xs font-bold text-neutral-900">Apply to Build Solution</span>
                        <p className="text-[10px] text-neutral-400">File your secure application. The project owner reviews developer details manually before selecting an assignee.</p>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">GitHub Profile Link / Username</label>
                          <input
                            type="text"
                            readOnly
                            value={`github.com/${currentUser?.profile?.githubUsername || currentUser?.name.toLowerCase().replace(/\s+/g, '')}`}
                            className="block w-full rounded-lg border border-neutral-200 bg-neutral-100 py-2 px-2.5 text-xs text-neutral-500 outline-none select-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">Your Email Address</label>
                          <input
                            type="text"
                            readOnly
                            value={currentUser?.email || ''}
                            className="block w-full rounded-lg border border-neutral-200 bg-neutral-100 py-2 px-2.5 text-xs text-neutral-500 outline-none select-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Statement of Interest</label>
                          <textarea
                            rows={3}
                            value={applyMessage}
                            onChange={(e) => setApplyMessage(e.target.value)}
                            placeholder="Why are you a good fit for this technical task?"
                            className="block w-full rounded-lg border border-neutral-200 bg-white py-2 px-2.5 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black resize-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Relevant Experience</label>
                          <textarea
                            rows={3}
                            value={applyExperience}
                            onChange={(e) => setApplyExperience(e.target.value)}
                            placeholder="Detail any similar work, libraries built, or issues resolved..."
                            className="block w-full rounded-lg border border-neutral-200 bg-white py-2 px-2.5 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-black resize-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowApplyForm(false)}
                          className="flex-1 rounded-lg border border-neutral-200 bg-white py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="flex-1 rounded-lg bg-black text-white py-2 text-xs font-bold hover:bg-neutral-800"
                        >
                          {actionLoading ? 'Applying...' : 'Send Application'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowApplyForm(true)}
                      className="w-full rounded-lg bg-black py-3 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 transition-colors cursor-pointer active:scale-98"
                    >
                      Apply to Claim Bounty
                    </button>
                  )}
                </div>
              )}

              {/* Display pending/approved application message to current builder */}
              {myClaim && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  myClaim.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800' :
                  myClaim.status === 'REJECTED' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}>
                  <strong>Application status: {myClaim.status}</strong>
                  {myClaim.status === 'PENDING' && (
                    <p className="mt-1">The hosting company has been notified. They will review your application. You will be cleared to submit solutions once approved.</p>
                  )}
                  {myClaim.status === 'APPROVED' && (
                    <div className="space-y-2 mt-2">
                      <p className="text-neutral-600">Congratulations! You have been selected as the assignee. You are locked onto this task.</p>
                      <div className="p-2.5 bg-white border border-emerald-100 rounded-lg text-[11px] font-mono text-neutral-700">
                        Work Workspace Locked.<br />
                        Bounty state: IN PROGRESS.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Solution Button */}
              {isApprovedBuilder && bounty.status !== 'APPROVED' && bounty.status !== 'PAID' && bounty.status !== 'COMPLETED' && (
                <button
                  id="btn-trigger-submit-form"
                  onClick={() => {
                    setShowSubmitForm(!showSubmitForm);
                    if(!showSubmitForm) {
                      setTimeout(() => {
                        document.getElementById('solution-submission-form')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                  }}
                  className="w-full rounded-lg border border-neutral-200 hover:bg-neutral-50 bg-white py-3 text-sm font-bold text-neutral-800 transition-colors cursor-pointer"
                >
                  {showSubmitForm ? 'Hide Submission Form' : 'Submit Solution / Work Branch'}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-6 text-xs text-neutral-500 space-y-3">
            <div className="flex items-center gap-1.5 text-neutral-900 font-bold">
              <Info className="h-4 w-4 text-neutral-400" />
              How verification works
            </div>
            <p className="leading-relaxed">
              Once a solution is submitted, BountyLoop alerts the company’s engineering leads. The code is reviewed and validated against requirements. Please note: BountyLoop does not currently process or escrow real money transactions. Payout infrastructure remains disabled. A 6.6% platform fee applies on successfully completed bounties. Payment infrastructure will be introduced before real-money transactions begin.
            </p>
          </div>

          {/* Share Bounty Widget (FEATURE 4) */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Share This Opportunity</h4>
            <p className="text-xs text-neutral-600 font-semibold leading-relaxed">
              Know someone who can solve this? Share this bounty.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <LinkIcon className="h-3.5 w-3.5 text-neutral-500" />}
                {copied ? 'Copied Link' : 'Copy Link'}
              </button>
              
              <button
                onClick={handleShareX}
                className="flex-1 rounded-lg bg-black hover:bg-neutral-800 px-3 py-2 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <svg className="h-3.5 w-3.5 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </button>
            </div>
            {typeof navigator.share !== 'undefined' && (
              <button
                onClick={handleNativeShare}
                className="w-full rounded-lg border border-neutral-200 hover:bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Send className="h-3.5 w-3.5 text-neutral-500" />
                Native Share
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded submission form panel */}
      {showSubmitForm && (
        <div 
          id="solution-submission-form" 
          className="mt-12 rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 max-w-4xl"
        >
          <div className="border-b border-neutral-100 pb-5">
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Submit Solution for Technical Review</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Provide links to your solution branch or deployment, alongside execution instructions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* GitHub/Portfolio Link */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                <LinkIcon className="inline h-3.5 w-3.5 mr-1" />
                Solution GitHub Repository / Pull Request Link
              </label>
              <input
                id="submit-sol-github"
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="e.g. https://github.com/myusername/optimized-react"
                className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 px-3 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-900"
              />
              {errors.githubUrl && <p className="mt-1.5 text-xs text-red-600">{errors.githubUrl}</p>}
            </div>

            {/* Optional Live Demo URL Link */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                <Building className="inline h-3.5 w-3.5 mr-1" />
                Live Demo / Deployment URL (Optional)
              </label>
              <input
                id="submit-sol-demo-url"
                type="text"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="e.g. https://my-optimized-dashboard.vercel.app"
                className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 px-3 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-900"
              />
              {errors.demoUrl && <p className="mt-1.5 text-xs text-red-600">{errors.demoUrl}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                <FileText className="inline h-3.5 w-3.5 mr-1" />
                Solution Architecture & Testing Process (min. 50 characters)
              </label>
              <textarea
                id="submit-sol-desc"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the strategy you used to solve this bounty. How did you optimize/integrate the systems? Provide benchmarking data or performance logs to prove requirements are fully met."
                className="block w-full rounded-lg border border-neutral-200 bg-white py-2.5 px-3 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-900 resize-y min-h-32"
              ></textarea>
              {errors.description && <p className="mt-1.5 text-xs text-red-600">{errors.description}</p>}
            </div>

            {/* Feedback Block */}
            {success && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                <Check className="h-5 w-5 text-emerald-600" />
                <span>Your solution was submitted successfully. The review queue is now open.</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                id="btn-cancel-submission"
                onClick={() => setShowSubmitForm(false)}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-solution-form"
                disabled={success || actionLoading}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-black px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Submit and Start Verification
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
