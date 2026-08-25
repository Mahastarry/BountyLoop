import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Gentle config status check instead of a hard exception
if (!process.env.NEXT_PUBLIC_SITE_URL) {
  console.info('[BountyLoop Config] NEXT_PUBLIC_SITE_URL is not set. The server will dynamically resolve links using APP_URL or request headers.');
}

import { db } from './src/server/db';
import { paymentService } from './src/server/payment';
import { githubService } from './src/server/github';
import { User, Session, Bounty, Claim, Submission, Winner, Payout, AuditEvent, BountyStatus, PaymentStatus, Application, Payment } from './src/server/types';

const app = express();
const PORT = 3000;

// Enable JSON parsing
app.use(express.json());

// Normalize paths on Vercel where the prefix might be stripped
app.use((req, res, next) => {
  if (!req.url.startsWith('/api')) {
    const apiPaths = ['/auth', '/bounties', '/me', '/admin', '/webhooks'];
    const match = apiPaths.find(p => req.url.startsWith(p));
    if (match) {
      req.url = '/api' + req.url;
    }
  }
  next();
});

// Robust JWT Secret getter to prevent issues with malformed secrets on Vercel
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    return 'bountyloop-secret-2026';
  }
  return secret.trim();
};

// Lightweight self-contained signature token helpers for flawless stateless sessions
const signToken = (payload: any) => {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', getJwtSecret()).update(data).digest('base64');
  return `${data}.${signature}`;
};

const verifyToken = (token: string) => {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;
    const expectedSignature = crypto.createHmac('sha256', getJwtSecret()).update(data).digest('base64');
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

// Simple Auth Middleware
interface AuthenticatedRequest extends Request {
  user?: User;
  sessionToken?: string;
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authorization header with Bearer token required' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    // Fall back to local sessions (just in case)
    const sessions = db.getSessions();
    const session = sessions.find((s) => s.token === token);
    if (!session || new Date(session.expiresAt) < new Date()) {
      if (session) {
        db.deleteSession(token);
      }
      return res.status(403).json({ error: 'Session expired or invalid' });
    }
    const users = db.getUsers();
    const user = users.find((u) => u.id === session.userId);
    if (!user) {
      return res.status(403).json({ error: 'User associated with session not found' });
    }
    req.user = user;
    req.sessionToken = token;
    return next();
  }

  // Self-heal user state in dynamic serverless instance
  let users = db.getUsers();
  let user = users.find((u) => u.id === payload.userId);
  if (!user) {
    user = {
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      passwordHash: 'restored-via-stateless-jwt',
      createdAt: new Date().toISOString()
    };
    db.saveUser(user);

    // Seed missing profile dynamically
    if (payload.role === 'COMPANY') {
      const companies = db.getCompanies();
      if (!companies.some(c => c.userId === user!.id)) {
        db.saveCompany({
          id: `company_${Date.now()}`,
          userId: user.id,
          companyName: `${user.name}'s Org`,
          website: '',
          bio: 'Self-healed company profile.'
        });
      }
    } else {
      const builders = db.getBuilders();
      if (!builders.some(b => b.userId === user!.id)) {
        db.saveBuilder({
          id: `builder_${Date.now()}`,
          userId: user.id,
          fullName: user.name,
          githubUsername: user.name.toLowerCase().replace(/\s+/g, ''),
          bio: 'Self-healed developer profile.',
          skills: []
        });
      }
    }
  }

  req.user = user;
  req.sessionToken = token;
  next();
};

// --- AUTH ENDPOINTS ---

// Register User
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, role, companyName, githubUsername, bio, website, portfolioUrl, skills } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (role !== 'COMPANY' && role !== 'BUILDER') {
      return res.status(400).json({ error: 'Role must be COMPANY or BUILDER' });
    }

    const users = db.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // SHA256 password hash
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const userId = `user_${Date.now()}`;

    const newUser: User = {
      id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      createdAt: new Date().toISOString()
    };

    db.saveUser(newUser);

    // Link profile based on role
    if (role === 'COMPANY') {
      db.saveCompany({
        id: `company_${Date.now()}`,
        userId,
        companyName: companyName || `${name}'s Org`,
        website,
        bio
      });
    } else {
      db.saveBuilder({
        id: `builder_${Date.now()}`,
        userId,
        fullName: name,
        githubUsername: githubUsername || name.toLowerCase().replace(/\s+/g, ''),
        bio,
        portfolioUrl,
        skills: Array.isArray(skills) ? skills : []
      });
    }

    // Record audit
    db.saveAuditEvent({
      id: `audit_${Date.now()}`,
      eventType: 'USER_REGISTERED',
      details: `New user ${email} registered with role ${role}.`,
      userId,
      createdAt: new Date().toISOString()
    });

    // Automatically log in
    const token = signToken({ userId, name, email, role });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const session: Session = {
      id: `sess_${Date.now()}`,
      token,
      userId,
      expiresAt,
      createdAt: new Date().toISOString()
    };

    db.saveSession(session);

    res.status(201).json({
      token,
      user: { id: userId, name, email, role }
    });
  } catch (err: any) {
    console.error('[AUTH REGISTER ERROR]', err);
    res.status(500).json({ error: 'Internal server error during registration', details: err.message });
  }
});

// Login User
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = db.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ userId: user.id, name: user.name, email: user.email, role: user.role });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const session: Session = {
      id: `sess_${Date.now()}`,
      token,
      userId: user.id,
      expiresAt,
      createdAt: new Date().toISOString()
    };

    db.saveSession(session);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err: any) {
    console.error('[AUTH LOGIN ERROR]', err);
    res.status(500).json({ error: 'Internal server error during login', details: err.message });
  }
});

// Google Sign-In Endpoint
app.post('/api/auth/google', (req: Request, res: Response) => {
  try {
    const { email, name, googleId } = req.body || {};

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const users = db.getUsers();
    let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    let isNew = false;
    if (!user) {
      isNew = true;
      const userId = `user_g_${Date.now()}`;
      // Create a random hashed password since they use Google auth
      const passwordHash = crypto.createHash('sha256').update(crypto.randomBytes(16)).digest('hex');
      user = {
        id: userId,
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'BUILDER', // Default to BUILDER, can change later during onboarding or in profile
        createdAt: new Date().toISOString()
      };
      db.saveUser(user);

      // Seed empty profile
      db.saveBuilder({
        id: `builder_${Date.now()}`,
        userId,
        fullName: name,
        githubUsername: name.toLowerCase().replace(/\s+/g, ''),
        bio: 'Signed up via Google.',
        skills: []
      });

      db.saveAuditEvent({
        id: `audit_${Date.now()}`,
        eventType: 'USER_REGISTERED_GOOGLE',
        details: `New user ${email} registered via Google.`,
        userId,
        createdAt: new Date().toISOString()
      });
    } else {
      db.saveAuditEvent({
        id: `audit_${Date.now()}`,
        eventType: 'USER_LOGGED_IN_GOOGLE',
        details: `User ${email} logged in via Google.`,
        userId: user.id,
        createdAt: new Date().toISOString()
      });
    }

    // Create Session
    const token = signToken({ userId: user.id, name: user.name, email: user.email, role: user.role });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const session: Session = {
      id: `sess_${Date.now()}`,
      token,
      userId: user.id,
      expiresAt,
      createdAt: new Date().toISOString()
    };

    db.saveSession(session);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      isNew
    });
  } catch (err: any) {
    console.error('[AUTH GOOGLE ERROR]', err);
    res.status(500).json({ error: 'Internal server error during Google Sign-In', details: err.message });
  }
});

// Update User Profile/Role
app.post('/api/auth/profile/update', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, role, companyName, website, bio, githubUsername, skills } = req.body;

  const users = db.getUsers();
  const dbUser = users.find((u) => u.id === user.id);
  if (!dbUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (name) {
    dbUser.name = name;
  }

  if (role && (role === 'COMPANY' || role === 'BUILDER')) {
    dbUser.role = role;
  }

  db.saveUser(dbUser);

  // Link or update profile details
  if (dbUser.role === 'COMPANY') {
    const companies = db.getCompanies();
    let company = companies.find((c) => c.userId === dbUser.id);
    if (!company) {
      company = {
        id: `company_${Date.now()}`,
        userId: dbUser.id,
        companyName: companyName || `${dbUser.name}'s Org`,
        website: website || '',
        bio: bio || ''
      };
    } else {
      if (companyName) company.companyName = companyName;
      if (website !== undefined) company.website = website;
      if (bio !== undefined) company.bio = bio;
    }
    db.saveCompany(company);
  } else {
    const builders = db.getBuilders();
    let builder = builders.find((b) => b.userId === dbUser.id);
    if (!builder) {
      builder = {
        id: `builder_${Date.now()}`,
        userId: dbUser.id,
        fullName: dbUser.name,
        githubUsername: githubUsername || dbUser.name.toLowerCase().replace(/\s+/g, ''),
        bio: bio || '',
        skills: Array.isArray(skills) ? skills : []
      };
    } else {
      if (githubUsername) builder.githubUsername = githubUsername;
      if (bio !== undefined) builder.bio = bio;
      if (skills !== undefined) builder.skills = Array.isArray(skills) ? skills : [];
    }
    db.saveBuilder(builder);
  }

  // Record audit event
  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    eventType: 'USER_PROFILE_UPDATED',
    details: `User ${dbUser.email} updated profile. Role set to ${dbUser.role}.`,
    userId: dbUser.id,
    createdAt: new Date().toISOString()
  });

  // Get final details
  let profileDetails = {};
  if (dbUser.role === 'COMPANY') {
    const companies = db.getCompanies();
    profileDetails = companies.find((c) => c.userId === dbUser.id) || {};
  } else {
    const builders = db.getBuilders();
    profileDetails = builders.find((b) => b.userId === dbUser.id) || {};
  }

  res.json({
    user: { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role },
    profile: profileDetails
  });
});

// Current User Profile Info
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let profileDetails = {};

  if (user.role === 'COMPANY') {
    const companies = db.getCompanies();
    profileDetails = companies.find((c) => c.userId === user.id) || {};
  } else {
    const builders = db.getBuilders();
    profileDetails = builders.find((b) => b.userId === user.id) || {};
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    profile: profileDetails
  });
});

// --- BOUNTY ENDPOINTS ---

// Fetch Bounties List (Filtered for public)
app.get('/api/bounties', (req: Request, res: Response) => {
  const bounties = db.getBounties();
  const claims = db.getClaims();
  const submissions = db.getSubmissions();
  const companies = db.getCompanies();

  // Try to decode optional auth token to see who is requesting
  let currentUser: any = null;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    currentUser = verifyToken(token);
  }

  // Find the company profile if logged in as COMPANY
  let companyProfileId: string | null = null;
  let companyProfileName: string | null = null;
  if (currentUser && currentUser.role === 'COMPANY') {
    const company = companies.find((c) => c.userId === currentUser.userId);
    if (company) {
      companyProfileId = company.id;
      companyProfileName = company.companyName;
    }
  }

  // Filter public and owner bounties
  const publicBounties = bounties.filter((b) => {
    // Check if the current user is the creator of this bounty
    const isOwner = (companyProfileId && b.companyId === companyProfileId) || 
                    (companyProfileName && b.companyName === companyProfileName);
                    
    if (isOwner) {
      return true; // The owner can see all their own bounties (even PENDING REVIEW)
    }

    // Only APPROVED / funded / active bounties appear in Explore Bounties for the general public
    // Since payment/payout is manual for the beta, we do NOT filter out unfunded ones if they are APPROVED or in active state
    const isApprovedOrActive = ['APPROVED', 'FUNDED', 'IN PROGRESS', 'SUBMITTED', 'COMPLETED', 'PAID'].includes(b.status);
    return isApprovedOrActive;
  });

  const enrichedBounties = publicBounties.map((b) => {
    const company = companies.find((c) => c.id === b.companyId);
    const bountyClaims = claims.filter((c) => c.bountyId === b.id);
    const bountySubmissions = submissions.filter((s) => s.bountyId === b.id);

    return {
      ...b,
      companyName: b.companyName || company?.companyName || 'Anonymous Company',
      claimsCount: bountyClaims.length,
      submissionsCount: bountySubmissions.length
    };
  });

  res.json(enrichedBounties);
});

// Create Bounty
app.post('/api/bounties', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (user.role !== 'COMPANY') {
    return res.status(403).json({ error: 'Only registered companies can post bounties.' });
  }

  const companies = db.getCompanies();
  const company = companies.find((c) => c.userId === user.id);

  if (!company) {
    return res.status(403).json({ error: 'Company profile not set up yet.' });
  }

  const { title, description, category, reward, githubRepoUrl, githubIssueId } = req.body;

  if (!title || !description || !category || !reward) {
    return res.status(400).json({ error: 'Title, description, category, and reward amount are required' });
  }

  const rewardAmount = parseFloat(reward);
  if (isNaN(rewardAmount) || rewardAmount <= 0) {
    return res.status(400).json({ error: 'Reward size must be a positive number' });
  }

  // Calculate platform fees strictly server-side
  const { fee, net } = paymentService.calculatePlatformFee(rewardAmount);

  const defaultDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const bountyId = `bounty_${Date.now()}`;
  const newBounty: Bounty = {
    id: bountyId,
    companyId: company.id,
    title,
    description,
    category,
    reward: rewardAmount,
    platformFee: fee,
    netPayout: net,
    status: 'PENDING REVIEW', // Starts as PENDING REVIEW (Submit for Review)
    paymentStatus: 'UNFUNDED',
    deadline: req.body.deadline || defaultDeadline,
    githubRepoUrl: githubRepoUrl || undefined,
    githubIssueId: githubIssueId ? String(githubIssueId) : undefined,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  };

  db.saveBounty(newBounty);

  // ALSO create a Payment record so it is tracked manually!
  const newPayment = {
    id: `pay_${Date.now()}`,
    bountyId: bountyId,
    reward: rewardAmount,
    platformFee: fee,
    developerPayout: net,
    fundingStatus: 'UNFUNDED',
    payoutStatus: 'UNPAID',
    createdAt: new Date().toISOString()
  };
  db.savePayment(newPayment);

  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    bountyId,
    eventType: 'BOUNTY_POSTED_PENDING_REVIEW',
    details: `Bounty "${title}" posted with reward $${rewardAmount}. Status set to PENDING REVIEW. Fee: $${fee}.`,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(newBounty);
});

// Fetch Bounty Detail (including submissions, claims, audit history)
app.get('/api/bounties/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const bounties = db.getBounties();
  const bounty = bounties.find((b) => b.id === id);

  if (!bounty) {
    return res.status(404).json({ error: 'Bounty not found' });
  }

  const companies = db.getCompanies();
  const company = companies.find((c) => c.id === bounty.companyId);

  const claims = db.getClaims();
  const bountyClaims = claims.filter((c) => c.bountyId === id);

  const builders = db.getBuilders();
  const users = db.getUsers();
  const enrichedClaims = bountyClaims.map((c) => {
    const builder = builders.find((b) => b.id === c.builderId);
    const user = builder ? users.find((u) => u.id === builder.userId) : null;
    return {
      ...c,
      developerName: builder?.fullName || 'Anonymous Developer',
      developerEmail: user?.email || 'N/A',
      githubUsername: builder?.githubUsername || 'N/A',
      bio: builder?.bio || 'No bio provided'
    };
  });

  const submissions = db.getSubmissions();
  const bountySubmissions = submissions.filter((s) => s.bountyId === id);

  const enrichedSubmissions = bountySubmissions.map((s) => {
    const builder = builders.find((b) => b.id === s.builderId);
    return {
      ...s,
      name: builder?.fullName || 'Anonymous Builder'
    };
  });

  const winners = db.getWinners();
  const winner = winners.find((w) => w.bountyId === id);

  const audits = db.getAuditEvents();
  const bountyAudits = audits.filter((a) => a.bountyId === id);

  res.json({
    bounty: {
      ...bounty,
      companyName: company?.companyName || 'Anonymous Company',
    },
    claims: enrichedClaims,
    submissions: enrichedSubmissions,
    winner,
    auditTrail: bountyAudits
  });
});

// Claim Bounty
app.post('/api/bounties/:id/claim', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  if (user.role !== 'BUILDER') {
    return res.status(403).json({ error: 'Only builders can claim bounties' });
  }

  const builders = db.getBuilders();
  const builder = builders.find((b) => b.userId === user.id);

  if (!builder) {
    return res.status(403).json({ error: 'Builder profile not set up yet.' });
  }

  const bounties = db.getBounties();
  const bounty = bounties.find((b) => b.id === id);

  if (!bounty) {
    return res.status(404).json({ error: 'Bounty not found' });
  }

  // Developer cannot claim an unfunded bounty
  if (bounty.paymentStatus !== 'FUNDED' || bounty.status !== 'FUNDED') {
    return res.status(400).json({ error: 'Bounty is not active or funded yet. Developers cannot claim unfunded bounties.' });
  }

  // Check if already claimed
  const claims = db.getClaims();
  const existingClaim = claims.find((c) => c.bountyId === id && c.builderId === builder.id);
  if (existingClaim) {
    return res.status(400).json({ error: 'You have already filed a claim request for this bounty' });
  }

  const { message, experience } = req.body;

  const claimId = `claim_${Date.now()}`;
  const newClaim: Claim = {
    id: claimId,
    bountyId: id,
    builderId: builder.id,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    message: message || undefined,
    experience: experience || undefined
  };

  db.saveClaim(newClaim);

  // Also save as an Application for full-stack admin tracking compliance
  const newApp: Application = {
    id: `app_${Date.now()}`,
    bountyId: id,
    developerId: builder.id,
    developerName: builder.fullName,
    developerEmail: user.email,
    githubUsername: builder.githubUsername,
    bio: builder.bio,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    message: message || undefined,
    experience: experience || undefined
  };

  db.saveApplication(newApp);

  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    bountyId: id,
    eventType: 'BOUNTY_CLAIM_REQUESTED',
    details: `Builder ${builder.fullName} (GitHub: ${builder.githubUsername}) requested to claim bounty.`,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(newClaim);
});

// Approve claim (locks builder onto bounty)
app.post('/api/bounties/:id/claims/:claimId/approve', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id, claimId } = req.params;
  const user = req.user!;

  const bounties = db.getBounties();
  const bounty = bounties.find((b) => b.id === id);

  if (!bounty) {
    return res.status(404).json({ error: 'Bounty not found' });
  }

  // Verify ownership of company
  const companies = db.getCompanies();
  const company = companies.find((c) => c.userId === user.id);

  if (!company || bounty.companyId !== company.id) {
    return res.status(403).json({ error: 'Only the company hosting the bounty can approve claim requests.' });
  }

  // Creator cannot select an unfunded bounty
  if (bounty.paymentStatus !== 'FUNDED') {
    return res.status(400).json({ error: 'Bounty is not funded yet. You must fund this bounty before selecting a developer.' });
  }

  const claims = db.getClaims();
  const claim = claims.find((c) => c.id === claimId);

  if (!claim) {
    return res.status(404).json({ error: 'Claim request not found' });
  }

  // Update claim status
  claim.status = 'APPROVED';
  db.saveClaim(claim);

  // Reject other pending claims
  claims.forEach((c) => {
    if (c.bountyId === id && c.id !== claimId && c.status === 'PENDING') {
      c.status = 'REJECTED';
      db.saveClaim(c);
    }
  });

  // Sync with applications collection
  const apps = db.getApplications();
  const matchedApp = apps.find((a) => a.bountyId === id && a.developerId === claim.builderId);
  if (matchedApp) {
    matchedApp.status = 'APPROVED';
    db.saveApplication(matchedApp);
  }
  apps.forEach((a) => {
    if (a.bountyId === id && a.developerId !== claim.builderId && a.status === 'PENDING') {
      a.status = 'REJECTED';
      db.saveApplication(a);
    }
  });

  // Sync payments collection
  const payments = db.getPayments();
  const payment = payments.find((p) => p.bountyId === id);
  if (payment) {
    payment.developerId = claim.builderId;
    db.savePayment(payment);
  }

  // Update bounty lifecycle
  bounty.status = 'IN PROGRESS';
  bounty.updatedAt = new Date().toISOString();
  db.saveBounty(bounty);

  const builders = db.getBuilders();
  const builder = builders.find((b) => b.id === claim.builderId);

  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    bountyId: id,
    eventType: 'BOUNTY_CLAIM_APPROVED',
    details: `Claim request approved. Bounty assigned exclusively to ${builder?.fullName || 'Builder'}.`,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, bounty, claim });
});

// Submit Solution for verification
app.post('/api/bounties/:id/submit', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  if (user.role !== 'BUILDER') {
    return res.status(403).json({ error: 'Only builders can submit solutions' });
  }

  const builders = db.getBuilders();
  const builder = builders.find((b) => b.userId === user.id);

  if (!builder) {
    return res.status(403).json({ error: 'Builder profile not set up yet.' });
  }

  const bounties = db.getBounties();
  const bounty = bounties.find((b) => b.id === id);

  if (!bounty) {
    return res.status(404).json({ error: 'Bounty not found' });
  }

  // Developer cannot mark work as completed without first being selected.
  const claims = db.getClaims();
  const approvedClaim = claims.find((c) => c.bountyId === id && c.builderId === builder.id && c.status === 'APPROVED');
  if (!approvedClaim) {
    return res.status(403).json({ error: 'You must be selected as the assignee for this bounty before you can submit a solution.' });
  }

  const { githubUrl, demoUrl, description } = req.body;

  if (!githubUrl || !description) {
    return res.status(400).json({ error: 'GitHub URL and solution description are required' });
  }

  // Prevent duplicate submissions by supporting solution updates / resubmissions
  const submissions = db.getSubmissions();
  const existingSub = submissions.find((s) => s.bountyId === id && s.builderId === builder.id);
  if (existingSub) {
    existingSub.githubUrl = githubUrl;
    existingSub.demoUrl = demoUrl || undefined;
    existingSub.description = description;
    existingSub.submittedAt = new Date().toISOString();
    db.saveSubmission(existingSub);

    // Update bounty lifecycle state
    bounty.status = 'SUBMITTED';
    bounty.updatedAt = new Date().toISOString();
    db.saveBounty(bounty);

    db.saveAuditEvent({
      id: `audit_${Date.now()}`,
      bountyId: id,
      eventType: 'BOUNTY_SOLUTION_RESUBMITTED',
      details: `Solution updated and resubmitted by ${builder.fullName}. GitHub link: ${githubUrl}.`,
      userId: user.id,
      createdAt: new Date().toISOString()
    });

    return res.json(existingSub);
  }

  // Record submission
  const subId = `sub_${Date.now()}`;
  const newSubmission: Submission = {
    id: subId,
    bountyId: id,
    builderId: builder.id,
    githubUrl,
    demoUrl: demoUrl || undefined,
    description,
    submittedAt: new Date().toISOString()
  };

  db.saveSubmission(newSubmission);

  // Link GitHub details if present
  const parsedRepo = githubService.parseGitHubUrl(githubUrl);
  if (parsedRepo && parsedRepo.type === 'pull') {
    bounty.githubPrUrl = githubUrl;
  }

  // Update bounty lifecycle state
  bounty.status = 'SUBMITTED';
  bounty.updatedAt = new Date().toISOString();
  db.saveBounty(bounty);

  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    bountyId: id,
    eventType: 'BOUNTY_SOLUTION_SUBMITTED',
    details: `Solution submitted by ${builder.fullName}. GitHub link: ${githubUrl}.`,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(newSubmission);
});

// Select Winner & Approve Submission (Creator Approves Completed Work)
app.post('/api/bounties/:id/approve-submission', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { submissionId, idempotencyKey } = req.body;
  const user = req.user!;

  if (!submissionId) {
    return res.status(400).json({ error: 'Submission ID is required to select a winner.' });
  }

  const bounties = db.getBounties();
  const bounty = bounties.find((b) => b.id === id);

  if (!bounty) {
    return res.status(404).json({ error: 'Bounty not found' });
  }

  // Verify ownership
  const companies = db.getCompanies();
  const company = companies.find((c) => c.userId === user.id);

  if (!company || bounty.companyId !== company.id) {
    return res.status(403).json({ error: 'Only the company hosting the bounty can select the winner.' });
  }

  const submissions = db.getSubmissions();
  const submission = submissions.find((s) => s.id === submissionId);

  if (!submission || submission.bountyId !== id) {
    return res.status(404).json({ error: 'Submission not found on this bounty' });
  }

  // Generate winner record
  const winId = `win_${Date.now()}`;
  const newWinner: Winner = {
    id: winId,
    bountyId: id,
    submissionId,
    builderId: submission.builderId,
    createdAt: new Date().toISOString()
  };

  db.saveWinner(newWinner);

  // Generate payout with strict server-side calculation and idempotency protection
  const payoutKey = idempotencyKey || `payout_token_${id}_${submissionId}`;
  const payoutRes = await paymentService.createPayout(id, submission.builderId, bounty.reward, payoutKey);

  // Update bounty lifecycle
  bounty.status = 'COMPLETED';
  bounty.paymentStatus = 'PAYOUT_PENDING';
  bounty.updatedAt = new Date().toISOString();
  db.saveBounty(bounty);

  const builders = db.getBuilders();
  const builder = builders.find((b) => b.id === submission.builderId);

  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    bountyId: id,
    eventType: 'BOUNTY_WINNER_APPROVED',
    details: `Submission approved. Winner selected: ${builder?.fullName || 'Builder'}. Net payout assigned: $${payoutRes.amount}.`,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  res.json({
    success: true,
    winner: newWinner,
    payout: payoutRes,
    bounty
  });
});

// Reject Submission / Request Changes (Creator Requests Changes on Work)
app.post('/api/bounties/:id/reject-submission', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.user!;

  const bounties = db.getBounties();
  const bounty = bounties.find((b) => b.id === id);

  if (!bounty) {
    return res.status(404).json({ error: 'Bounty not found' });
  }

  // Verify ownership
  const companies = db.getCompanies();
  const company = companies.find((c) => c.userId === user.id);

  if (!company || bounty.companyId !== company.id) {
    return res.status(403).json({ error: 'Only the company hosting the bounty can request changes.' });
  }

  if (bounty.status !== 'SUBMITTED') {
    return res.status(400).json({ error: 'Bounty is not currently submitted for review.' });
  }

  // Update bounty status back to IN PROGRESS
  bounty.status = 'IN PROGRESS';
  bounty.updatedAt = new Date().toISOString();
  db.saveBounty(bounty);

  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    bountyId: id,
    eventType: 'BOUNTY_CHANGES_REQUESTED',
    details: `Changes requested by company. Reason: ${reason || 'No specific reason provided.'}`,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, bounty, reason });
});

// Creator reports funding payment deposited via Razorpay
app.post('/api/bounties/:id/payment-deposited', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const bounties = db.getBounties();
  const bounty = bounties.find((b) => b.id === id);

  if (!bounty) {
    return res.status(404).json({ error: 'Bounty not found' });
  }

  // Verify ownership
  const companies = db.getCompanies();
  const company = companies.find((c) => c.userId === user.id);

  if (!company || bounty.companyId !== company.id) {
    return res.status(403).json({ error: 'Only the company hosting the bounty can report payments.' });
  }

  // Update bounty paymentStatus
  bounty.paymentStatus = 'FUNDING_PENDING';
  bounty.updatedAt = new Date().toISOString();
  db.saveBounty(bounty);

  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    bountyId: id,
    eventType: 'BOUNTY_FUNDING_SUBMITTED',
    details: `Creator reported funding deposit sent via Razorpay. Awaiting Admin verification.`,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, bounty });
});

// Developer Dashboard claims/applications feed
app.get('/api/my-applications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== 'BUILDER') {
    return res.status(403).json({ error: 'Only developers can view their applications' });
  }

  const builders = db.getBuilders();
  const builder = builders.find(b => b.userId === user.id);
  if (!builder) {
    return res.json([]);
  }

  const claims = db.getClaims();
  const bounties = db.getBounties();
  const submissions = db.getSubmissions();

  const developerClaims = claims.filter(c => c.builderId === builder.id);

  const enrichedClaims = developerClaims.map(c => {
    const bounty = bounties.find(b => b.id === c.bountyId);
    const sub = submissions.find(s => s.bountyId === c.bountyId && s.builderId === builder.id);
    return {
      claim: c,
      bounty,
      submission: sub
    };
  });

  res.json(enrichedClaims);
});

// Creator Dashboard claims/applications feed
app.get('/api/creator/applications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== 'COMPANY') {
    return res.status(403).json({ error: 'Only companies can view applications' });
  }

  const companies = db.getCompanies();
  const company = companies.find(c => c.userId === user.id);
  if (!company) {
    return res.json([]);
  }

  const bounties = db.getBounties();
  const myBountyIds = bounties
    .filter(b => b.companyId === company.id)
    .map(b => b.id);

  const apps = db.getApplications();
  const myBountyApps = apps.filter(a => myBountyIds.includes(a.bountyId));

  const enrichedApps = myBountyApps.map(a => {
    const bounty = bounties.find(b => b.id === a.bountyId);
    return {
      ...a,
      bountyTitle: bounty?.title || 'Unknown Bounty',
      bountyStatus: bounty?.status || 'Unknown'
    };
  });

  res.json(enrichedApps);
});

// --- ADMIN ENDPOINTS ---

// Admin Stats
app.get('/api/admin/stats', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  const bounties = db.getBounties();
  const applications = db.getApplications();
  const payments = db.getPayments();

  const totalBounties = bounties.length;
  const pendingSubmissions = bounties.filter(b => b.status === 'PENDING REVIEW').length;
  const fundedBounties = bounties.filter(b => b.status === 'FUNDED' || b.paymentStatus === 'FUNDED').length;
  const activeBounties = bounties.filter(b => ['APPROVED', 'FUNDED', 'IN PROGRESS', 'SUBMITTED'].includes(b.status)).length;
  const completedBounties = bounties.filter(b => b.status === 'COMPLETED').length;

  const totalBountyValue = bounties.reduce((sum, b) => sum + b.reward, 0);
  const totalPlatformFees = bounties.reduce((sum, b) => sum + b.platformFee, 0);
  const pendingDeveloperApplications = applications.filter(a => a.status === 'PENDING').length;
  
  const pendingPayoutsCount = payments.filter(p => p.payoutStatus !== 'PAID').length;

  res.json({
    totalBounties,
    pendingSubmissions,
    fundedBounties,
    activeBounties,
    completedBounties,
    totalBountyValue,
    totalPlatformFees,
    pendingDeveloperApplications,
    pendingPayouts: pendingPayoutsCount
  });
});

// Admin Get Bounties (Unfiltered)
app.get('/api/admin/bounties', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) return res.status(403).json({ error: 'Access denied' });

  res.json(db.getBounties());
});

// Admin Create Bounty directly (manual entry from Google Form)
app.post('/api/admin/bounties', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) return res.status(403).json({ error: 'Access denied' });

  const { title, description, category, reward, companyName, deadline, requirements, technology, acceptanceCriteria } = req.body;

  if (!title || !description || !category || !reward) {
    return res.status(400).json({ error: 'Title, description, category, and reward are required.' });
  }

  const rewardAmount = parseFloat(reward);
  const platformFee = rewardAmount * 0.066;
  const netPayout = rewardAmount * 0.934;

  const bountyId = `bounty_${Date.now()}`;
  const newBounty: Bounty = {
    id: bountyId,
    companyId: 'company-admin',
    companyName: companyName || 'Google Form Submitter',
    title,
    description,
    requirements: requirements || undefined,
    technology: technology || undefined,
    acceptanceCriteria: acceptanceCriteria || undefined,
    category,
    reward: rewardAmount,
    platformFee,
    netPayout,
    status: 'PENDING REVIEW',
    paymentStatus: 'UNFUNDED',
    deadline: deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  };

  db.saveBounty(newBounty);

  const newPayment: Payment = {
    id: `pay_${Date.now()}`,
    bountyId: bountyId,
    reward: rewardAmount,
    platformFee: platformFee,
    developerPayout: netPayout,
    fundingStatus: 'UNFUNDED',
    payoutStatus: 'UNPAID',
    createdAt: new Date().toISOString()
  };
  db.savePayment(newPayment);

  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    bountyId,
    eventType: 'BOUNTY_SUBMISSION_ADDED',
    details: `Admin added bounty submission "${title}" from Google Form responses with reward $${rewardAmount}.`,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  res.status(201).json(newBounty);
});

// Admin Edit Bounty
app.put('/api/admin/bounties/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) return res.status(403).json({ error: 'Access denied' });

  const { id } = req.params;
  const bounties = db.getBounties();
  const bounty = bounties.find(b => b.id === id);
  if (!bounty) return res.status(404).json({ error: 'Bounty not found' });

  const { title, description, category, reward, deadline, requirements, technology, acceptanceCriteria, companyName } = req.body;

  if (title) bounty.title = title;
  if (description) bounty.description = description;
  if (category) bounty.category = category;
  if (deadline) bounty.deadline = deadline;
  if (requirements) bounty.requirements = requirements;
  if (technology) bounty.technology = technology;
  if (acceptanceCriteria) bounty.acceptanceCriteria = acceptanceCriteria;
  if (companyName) bounty.companyName = companyName;

  if (reward !== undefined) {
    const rewardAmount = parseFloat(reward);
    bounty.reward = rewardAmount;
    bounty.platformFee = rewardAmount * 0.066;
    bounty.netPayout = rewardAmount * 0.934;

    const payments = db.getPayments();
    const payment = payments.find(p => p.bountyId === id);
    if (payment) {
      payment.reward = rewardAmount;
      payment.platformFee = bounty.platformFee;
      payment.developerPayout = bounty.netPayout;
      db.savePayment(payment);
    }
  }

  bounty.updatedAt = new Date().toISOString();
  db.saveBounty(bounty);

  res.json(bounty);
});

// Admin Update Bounty Status
app.post('/api/admin/bounties/:id/status', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) return res.status(403).json({ error: 'Access denied' });

  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  const bounties = db.getBounties();
  const bounty = bounties.find(b => b.id === id);
  if (!bounty) return res.status(404).json({ error: 'Bounty not found' });

  if (status) bounty.status = status as BountyStatus;
  if (paymentStatus) {
    bounty.paymentStatus = paymentStatus as PaymentStatus;

    const payments = db.getPayments();
    const payment = payments.find(p => p.bountyId === id);
    if (payment) {
      if (paymentStatus === 'FUNDED') {
        payment.fundingStatus = 'FUNDED';
        payment.paymentDate = new Date().toISOString().split('T')[0];
      }
      if (paymentStatus === 'PAID') {
        payment.payoutStatus = 'PAID';
        payment.payoutDate = new Date().toISOString().split('T')[0];
      }
      db.savePayment(payment);
    }
  }

  bounty.updatedAt = new Date().toISOString();
  db.saveBounty(bounty);

  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    bountyId: id,
    eventType: 'BOUNTY_STATUS_UPDATED',
    details: `Admin updated bounty status to "${bounty.status}" and payment status to "${bounty.paymentStatus}".`,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  res.json(bounty);
});

// Admin Get Applications
app.get('/api/admin/applications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) return res.status(403).json({ error: 'Access denied' });

  const apps = db.getApplications();
  const bounties = db.getBounties();

  const enrichedApps = apps.map(app => {
    const bounty = bounties.find(b => b.id === app.bountyId);
    return {
      ...app,
      bountyTitle: bounty?.title || 'Unknown Bounty'
    };
  });

  res.json(enrichedApps);
});

// Admin Approve/Reject Application
app.post('/api/admin/applications/:id/status', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) return res.status(403).json({ error: 'Access denied' });

  const { id } = req.params;
  const { status } = req.body;

  const apps = db.getApplications();
  const app = apps.find(a => a.id === id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  app.status = status;
  db.saveApplication(app);

  const claims = db.getClaims();
  const claim = claims.find(c => c.bountyId === app.bountyId && c.builderId === app.developerId);
  if (claim) {
    claim.status = status;
    db.saveClaim(claim);
  }

  const bounties = db.getBounties();
  const bounty = bounties.find(b => b.id === app.bountyId);

  if (status === 'APPROVED' && bounty) {
    bounty.status = 'IN PROGRESS';
    bounty.updatedAt = new Date().toISOString();
    db.saveBounty(bounty);

    apps.forEach(a => {
      if (a.bountyId === app.bountyId && a.id !== id && a.status === 'PENDING') {
        a.status = 'REJECTED';
        db.saveApplication(a);
      }
    });

    claims.forEach(c => {
      if (c.bountyId === app.bountyId && c.builderId !== app.developerId && c.status === 'PENDING') {
        c.status = 'REJECTED';
        db.saveClaim(c);
      }
    });

    const payments = db.getPayments();
    const payment = payments.find(p => p.bountyId === app.bountyId);
    if (payment) {
      payment.developerId = app.developerId;
      db.savePayment(payment);
    }
  }

  db.saveAuditEvent({
    id: `audit_${Date.now()}`,
    bountyId: app.bountyId,
    eventType: `APPLICATION_${status}`,
    details: `Admin marked application ${id} for developer ${app.developerName} as ${status}.`,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  res.json(app);
});

// Admin Get Creators
app.get('/api/admin/creators', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) return res.status(403).json({ error: 'Access denied' });

  res.json(db.getCompanies());
});

// Admin Get Developers
app.get('/api/admin/developers', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) return res.status(403).json({ error: 'Access denied' });

  res.json(db.getBuilders());
});

// Admin Get Payments
app.get('/api/admin/payments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) return res.status(403).json({ error: 'Access denied' });

  const payments = db.getPayments();
  const bounties = db.getBounties();
  const developers = db.getBuilders();

  const enrichedPayments = payments.map(pay => {
    const bounty = bounties.find(b => b.id === pay.bountyId);
    const developer = developers.find(d => d.id === pay.developerId);
    return {
      ...pay,
      bountyTitle: bounty?.title || 'Unknown Bounty',
      developerName: developer?.fullName || 'Not Assigned'
    };
  });

  res.json(enrichedPayments);
});

// Admin Update Payment record manually
app.post('/api/admin/payments/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@bountyloop.com' || user.email === 'mahaswetakingdom@gmail.com';
  if (!isAdmin) return res.status(403).json({ error: 'Access denied' });

  const { id } = req.params;
  const { fundingStatus, payoutStatus, paymentDate, payoutDate } = req.body;

  const payments = db.getPayments();
  const payment = payments.find(p => p.id === id);
  if (!payment) return res.status(404).json({ error: 'Payment record not found' });

  if (fundingStatus) payment.fundingStatus = fundingStatus;
  if (payoutStatus) payment.payoutStatus = payoutStatus;
  if (paymentDate !== undefined) payment.paymentDate = paymentDate || undefined;
  if (payoutDate !== undefined) payment.payoutDate = payoutDate || undefined;

  db.savePayment(payment);

  const bounties = db.getBounties();
  const bounty = bounties.find(b => b.id === payment.bountyId);
  if (bounty) {
    if (fundingStatus === 'FUNDED') {
      bounty.paymentStatus = 'FUNDED';
      if (bounty.status === 'PENDING REVIEW' || bounty.status === 'APPROVED' || bounty.status === 'FUNDING REQUIRED') {
        bounty.status = 'FUNDED';
      }
    }
    if (payoutStatus === 'PAID') {
      bounty.paymentStatus = 'PAID';
      bounty.status = 'COMPLETED';
    }
    bounty.updatedAt = new Date().toISOString();
    db.saveBounty(bounty);
  }

  res.json(payment);
});

// --- GITHUB WEBHOOK ENDPOINT ---
app.post('/api/webhooks/github', (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  const rawBody = JSON.stringify(req.body);

  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (secret) {
    const isValid = githubService.verifySignature(rawBody, signature, secret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }
  }

  const result = githubService.processWebhookEvent(event, req.body);
  res.json(result);
});

// --- SHAREABLE BOUNTY PAGES WITH DYNAMIC SEO METADATA ---
app.get('/bounties/:id', (req: Request, res: Response) => {
  const bountyId = req.params.id;
  const bounties = db.getBounties();
  const bounty = bounties.find((b) => b.id === bountyId);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
    || process.env.APP_URL 
    || `${req.protocol}://${req.get('host')}`;

  let title = 'BountyLoop | Real Software Bounties for Developers';
  let description = 'Fund and solve software bounties directly with real, manual payout clearing.';
  
  if (bounty) {
    title = `$${bounty.reward.toLocaleString()} Bounty: Fix ${bounty.title} | BountyLoop`;
    description = bounty.description 
      ? bounty.description.replace(/["\r\n]+/g, ' ').substring(0, 155) + '...'
      : 'Solve this vetted technical issue on BountyLoop to claim the reward.';
  }

  // Load index.html based on environment
  const indexPath = process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'dist', 'index.html')
    : path.join(process.cwd(), 'index.html');

  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      console.error('Error reading index.html', err);
      return res.status(500).send('Server Error');
    }

    // Replace the default meta tags in index.html dynamically
    let modifiedHtml = html
      .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
      .replace(/<meta name="description" content=".*?" \/>/g, `<meta name="description" content="${description}" />`)
      .replace(/<meta property="og:title" content=".*?" \/>/g, `<meta property="og:title" content="${title}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/g, `<meta property="og:description" content="${description}" />`)
      .replace(/<meta property="og:type" content=".*?" \/>/g, `<meta property="og:type" content="website" />`);

    const ogImage = `${siteUrl}/assets/logo.png`; 
    const ogUrl = `${siteUrl}/bounties/${bountyId}`;

    const additionalMeta = `
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:url" content="${ogUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
    `;

    modifiedHtml = modifiedHtml.replace('</head>', `${additionalMeta}\n  </head>`);

    res.send(modifiedHtml);
  });
});

// --- GLOBAL ERROR HANDLING MIDDLEWARE ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[GLOBAL SERVER ERROR]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// --- VITE ENTRYPOINT ROUTING CONFIGURATION ---


async function startServer() {
  // Vite dev middleware for Hot Reload and source mapping in local preview container
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static delivery from dist directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only start the listening daemon if we are NOT running in a serverless environment like Vercel
  if (!process.env.VERCEL && !process.env.NOW_DEPLOYMENT) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`BountyLoop Full-Stack Server booted successfully on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

export default app;
