import { useState } from 'react';
import { Layers, Send, ExternalLink, ShieldCheck, Check, Github } from 'lucide-react';

interface PostBountyFormProps {
  onAddBounty: (newBountyData: {
    title: string;
    description: string;
    category: string;
    reward: number;
    githubRepoUrl?: string;
    githubIssueId?: string;
  }) => Promise<void>;
  onCancel: () => void;
  currentUser: any;
  onOpenAuth: () => void;
}

export default function PostBountyForm({ onAddBounty, onCancel, currentUser, onOpenAuth }: PostBountyFormProps) {
  const [hasOpenedForm, setHasOpenedForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleOpenForm = () => {
    window.open('https://forms.gle/CuN8tdj7FpQobBUd8', '_blank', 'noopener,noreferrer');
    setHasOpenedForm(true);
  };

  const handleConfirmSubmit = () => {
    setSubmitted(true);
  };

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center font-sans">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 mx-auto mb-6">
          <Github className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900">Registered Creators Only</h2>
        <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
          Postings must be signed with a valid Creator profile. Please connect your credentials first to unlock technical listings.
        </p>
        <button
          onClick={onOpenAuth}
          className="mt-6 rounded-lg bg-black px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          Connect Profile / Sign In
        </button>
      </div>
    );
  }

  // Support both COMPANY / Creator roles since user is a Creator or Developer
  // The backend role mapping for Creator is COMPANY
  if (currentUser.role !== 'COMPANY') {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center font-sans">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 mx-auto mb-6">
          <Layers className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900">Action Restricted</h2>
        <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
          Your current profile is configured as a **Developer**. Only organizations with **Creator** accounts can submit bounty challenges.
        </p>
        <button
          onClick={onCancel}
          className="mt-6 rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          Back to Exploration
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center font-sans animate-fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 mx-auto mb-6">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-neutral-950">Bounty Submitted</h2>
        <p className="mt-3 text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
          Thanks! Your bounty has been submitted for review.
        </p>
        <button
          onClick={onCancel}
          className="mt-8 rounded-lg bg-black px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div id="post-bounty-view" className="mx-auto max-w-3xl px-6 py-12 lg:px-8 font-sans">
      <div id="post-header" className="border-b border-neutral-100 pb-6 text-center md:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950">
          Submit a Bounty
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Tell us about the technical challenge. Every bounty is manually reviewed before being published.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-6 md:p-8 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-3">
            <h2 className="text-lg font-bold text-neutral-900">BountyLoop Creator Submission</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              We leverage an external secure submission form to intake challenges, set goals, and define repository branches. This ensures proper human scoping before launch.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              type="button"
              onClick={handleOpenForm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              Open Google Submission Form
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto rounded-lg border border-neutral-200 bg-white px-6 py-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {hasOpenedForm && (
            <div className="pt-6 border-t border-neutral-200/60 max-w-md mx-auto space-y-4 animate-fade-in">
              <p className="text-xs font-semibold text-neutral-700">
                Have you completed and submitted the Google Form?
              </p>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                Yes, I Have Submitted It
              </button>
            </div>
          )}
        </div>

        {/* Informative split panel matching standard product guidelines */}
        <div id="payout-split-panel" className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-neutral-900" />
            Beta Scoping Process
          </h3>
          <ul className="space-y-2 text-xs text-neutral-500 list-disc list-inside">
            <li>Google Form submissions are tracked automatically.</li>
            <li>BountyLoop Admins review the submission details, pricing structures, and test cases.</li>
            <li>Approved submissions are manually published by an Admin to the Explore Feed.</li>
            <li>Platform fees are calculated server-side at a fixed rate of 6.6%.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

