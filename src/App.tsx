import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Header from './components/Header';
import Footer from './components/Footer';
import Hero from './components/Hero';
import BountyList from './components/BountyList';
import BountyDetail from './components/BountyDetail';
import PostBountyForm from './components/PostBountyForm';
import AuthModal from './components/AuthModal';
import AdminDashboard from './components/AdminDashboard';
import Dashboard from './components/Dashboard';
import { api } from './lib/api';
import { Sparkles, X } from 'lucide-react';

type View =
  | { type: 'home' }
  | { type: 'browse' }
  | { type: 'detail'; bountyId: string }
  | { type: 'post' }
  | { type: 'admin' }
  | { type: 'dashboard' };

export default function App() {
  const [bounties, setBounties] = useState<any[]>([]);
  const [activeBountyDetail, setActiveBountyDetail] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalIsLogin, setAuthModalIsLogin] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Parse Initial view from path and query parameters
  const getInitialView = (): View => {
    // Check path-based routing first
    const path = window.location.pathname;
    const pathMatch = path.match(/^\/bounties\/([^/]+)/);
    if (pathMatch) {
      return { type: 'detail', bountyId: pathMatch[1] };
    }

    const params = new URLSearchParams(window.location.search);
    const viewType = params.get('view');
    const bountyId = params.get('id');

    if (viewType === 'browse') return { type: 'browse' };
    if (viewType === 'post') return { type: 'post' };
    if (viewType === 'admin') return { type: 'admin' };
    if (viewType === 'dashboard') return { type: 'dashboard' };
    if (viewType === 'detail' && bountyId) return { type: 'detail', bountyId };
    return { type: 'home' };
  };

  const [view, setView] = useState<View>(getInitialView);

  // Toast notifier helper
  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Sync / fetch all bounties from server
  const fetchBounties = useCallback(async () => {
    try {
      const data = await api.getBounties();
      setBounties(data);
    } catch (e) {
      console.error('Error fetching bounties', e);
    }
  }, []);

  // Fetch a single bounty detail state (runs on click or detail view load)
  const fetchBountyDetail = useCallback(async (bountyId: string) => {
    try {
      const data = await api.getBounty(bountyId);
      setActiveBountyDetail(data);
    } catch (e) {
      console.error('Error loading bounty detail', e);
      showToast('Bounty details could not be retrieved from the server.');
    }
  }, []);

  // Bootstrapping session checking
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('bountyloop_auth_token');
      if (token) {
        api.setToken(token);
        const profileRes = await api.getMe();
        if (profileRes) {
          setCurrentUser(profileRes.user);
        } else {
          localStorage.removeItem('bountyloop_auth_token');
        }
      }
    };
    checkUser();
    fetchBounties();
  }, [fetchBounties]);

  // Handle Detail view updates
  useEffect(() => {
    if (view.type === 'detail') {
      fetchBountyDetail(view.bountyId);
    } else {
      setActiveBountyDetail(null);
    }
  }, [view, fetchBountyDetail]);

  // Centralized navigation router
  const navigateTo = (newView: View) => {
    if ((newView.type === 'dashboard' || newView.type === 'post') && !currentUser) {
      setAuthModalIsLogin(newView.type === 'dashboard' ? true : false);
      setShowAuthModal(true);
      showToast('Please sign in or create an account to access that feature.');
      return;
    }
    setView(newView);
    let newUrl = '/';
    if (newView.type === 'detail') {
      newUrl = `/bounties/${newView.bountyId}`;
    } else if (newView.type !== 'home') {
      const params = new URLSearchParams();
      params.set('view', newView.type);
      newUrl = `?${params.toString()}`;
    }
    window.history.pushState({ view: newView }, '', newUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to browser history navigation (back / forward)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setView(e.state.view);
      } else {
        setView(getInitialView());
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auth Callbacks
  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    showToast(`Welcome to BountyLoop, ${user.name}!`);
    fetchBounties();
    navigateTo({ type: 'dashboard' });
  };

  const handleSignOut = () => {
    api.logout();
    setCurrentUser(null);
    showToast('Your session has been securely disconnected.');
    fetchBounties();
    navigateTo({ type: 'home' });
  };

  // Create bounty action
  const handleAddBounty = async (bountyData: any) => {
    const newBounty = await api.createBounty(bountyData);
    showToast(`Bounty "${newBounty.title}" posted successfully in Marketplace!`);
    await fetchBounties();
  };

  // Claim bounty action
  const handleClaimBounty = async (claimData?: { message: string; experience: string }) => {
    if (view.type !== 'detail') return;
    const claim = await api.claimBounty(view.bountyId, claimData);
    showToast('Your application request was successfully submitted to the project maintainers.');
    await fetchBounties();
    await fetchBountyDetail(view.bountyId);
  };

  // Approve Claim action
  const handleApproveClaim = async (claimId: string) => {
    if (view.type !== 'detail') return;
    await api.approveClaim(view.bountyId, claimId);
    showToast('Developer application approved. Bounty assignment locked.');
    await fetchBounties();
    await fetchBountyDetail(view.bountyId);
  };

  // Submit Solution action
  const handleAddSolution = async (solutionData: any) => {
    if (view.type !== 'detail') return;
    await api.submitSolution(view.bountyId, solutionData);
    showToast('Solution submitted successfully. Engineering review pending.');
    await fetchBounties();
    await fetchBountyDetail(view.bountyId);
  };

  // Select Winner action
  const handleApproveSubmission = async (submissionId: string) => {
    if (view.type !== 'detail') return;
    const key = `idempotent_key_${view.bountyId}_${submissionId}_${Date.now()}`;
    await api.approveSubmission(view.bountyId, { submissionId, idempotencyKey: key });
    showToast('Winner approved! The platform payout has been requested.');
    await fetchBounties();
    await fetchBountyDetail(view.bountyId);
  };

  // Request Changes / Reject Solution action
  const handleRejectSubmission = async (reason: string) => {
    if (view.type !== 'detail') return;
    await api.rejectSubmission(view.bountyId, reason);
    showToast('Changes requested. The developer has been notified.');
    await fetchBounties();
    await fetchBountyDetail(view.bountyId);
  };

  // Confirm escrow payment deposited
  const handleConfirmPaymentDeposited = async () => {
    if (view.type !== 'detail') return;
    await api.confirmPaymentDeposited(view.bountyId);
    showToast('Payment notification submitted to admin. Go-live pending verification.');
    await fetchBounties();
    await fetchBountyDetail(view.bountyId);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 font-sans selection:bg-neutral-950 selection:text-white">
      {/* Dynamic Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            id="toast-notification"
            className="fixed top-20 right-6 z-[80] flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xl max-w-sm"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white shrink-0">
              <Sparkles className="h-4.5 w-4.5 text-amber-300" />
            </div>
            <div className="flex-1 text-sm font-medium leading-relaxed pr-2 text-neutral-800">
              {notification}
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal overlay */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          initialIsLogin={authModalIsLogin}
        />
      )}

      {/* Shared Header Component */}
      <Header
        currentView={view.type}
        currentUser={currentUser}
        onOpenAuth={(isLogin) => {
          setAuthModalIsLogin(isLogin !== undefined ? isLogin : true);
          setShowAuthModal(true);
        }}
        onSignOut={handleSignOut}
        onNavigate={(targetTab) => navigateTo({ type: targetTab })}
      />

      {/* Main Core Router Workspace */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view.type === 'home' && (
            <motion.div
              key="home-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Hero
                bounties={bounties}
                onNavigate={(targetTab) => navigateTo({ type: targetTab })}
                onSelectBounty={(bountyId) => navigateTo({ type: 'detail', bountyId })}
              />
            </motion.div>
          )}

          {view.type === 'browse' && (
            <motion.div
              key="browse-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <BountyList
                bounties={bounties}
                onSelectBounty={(bountyId) => navigateTo({ type: 'detail', bountyId })}
              />
            </motion.div>
          )}

          {view.type === 'detail' && (() => {
            if (!activeBountyDetail) {
              return (
                <div className="mx-auto max-w-7xl px-6 py-24 text-center">
                  <h2 className="text-xl font-bold">Synchronizing bounty detail record...</h2>
                  <button
                    onClick={() => navigateTo({ type: 'browse' })}
                    className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white cursor-pointer"
                  >
                    Return to discovery
                  </button>
                </div>
              );
            }

            return (
              <motion.div
                key={`detail-view-${view.bountyId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <BountyDetail
                  bounty={activeBountyDetail.bounty}
                  claims={activeBountyDetail.claims}
                  solutions={activeBountyDetail.submissions}
                  auditTrail={activeBountyDetail.auditTrail}
                  currentUser={currentUser}
                  onClaim={handleClaimBounty}
                  onApproveClaim={handleApproveClaim}
                  onAddSolution={handleAddSolution}
                  onApproveSubmission={handleApproveSubmission}
                  onRejectSubmission={handleRejectSubmission}
                  onConfirmPaymentDeposited={handleConfirmPaymentDeposited}
                  onBack={() => navigateTo({ type: 'browse' })}
                />
              </motion.div>
            );
          })()}

          {view.type === 'post' && (
            <motion.div
              key="post-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PostBountyForm
                currentUser={currentUser}
                onOpenAuth={() => setShowAuthModal(true)}
                onAddBounty={handleAddBounty}
                onCancel={() => navigateTo({ type: 'browse' })}
              />
            </motion.div>
          )}

          {view.type === 'admin' && (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AdminDashboard
                currentUser={currentUser}
                onBack={() => navigateTo({ type: 'home' })}
              />
            </motion.div>
          )}

          {view.type === 'dashboard' && (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard
                currentUser={currentUser}
                onNavigate={(dest: string) => {
                  if (dest.startsWith('detail-')) {
                    navigateTo({ type: 'detail', bountyId: dest.replace('detail-', '') });
                  } else {
                    navigateTo({ type: dest as any });
                  }
                }}
                showToast={showToast}
                onUpdateUser={(updatedUser) => setCurrentUser(updatedUser)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Shared Footer Component */}
      <Footer onNavigate={(targetTab) => navigateTo({ type: targetTab })} />
    </div>
  );
}
