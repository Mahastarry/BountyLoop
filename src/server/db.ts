import fs from 'fs';
import path from 'path';
import { DatabaseSchema, User, Session, Company, Builder, Bounty, Claim, Submission, Winner, Payout, AuditEvent } from './types';

const IS_VERCEL = !!(process.env.VERCEL || process.env.NOW_DEPLOYMENT);
const ORIGINAL_DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const DB_PATH = IS_VERCEL ? '/tmp/db.json' : ORIGINAL_DB_PATH;

// Ensure database directory exists
const ensureDbDirectory = () => {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (IS_VERCEL && !fs.existsSync(DB_PATH)) {
      try {
        if (fs.existsSync(ORIGINAL_DB_PATH)) {
          fs.copyFileSync(ORIGINAL_DB_PATH, DB_PATH);
          console.log('Successfully copied template database to writable /tmp/db.json');
        } else {
          // Fallback to initial data if original is missing
          fs.writeFileSync(DB_PATH, JSON.stringify(getInitialData(), null, 2), 'utf8');
          console.log('Initialized brand new database in /tmp/db.json');
        }
      } catch (err) {
        console.error('Failed to copy database template to /tmp/db.json', err);
      }
    }
  } catch (err) {
    console.error('Fatal error in ensureDbDirectory:', err);
  }
};

const getInitialData = (): DatabaseSchema => {
  return {
    users: [
      {
        id: 'user-admin',
        name: 'BountyLoop Admin',
        email: 'admin@bountyloop.com',
        passwordHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', // SHA256 of 'admin123'
        role: 'ADMIN' as any,
        createdAt: '2026-08-23T00:00:00.000Z'
      }
    ],
    sessions: [],
    companies: [
      { id: 'company-velocelabs', userId: 'user-velocelabs', companyName: 'Veloce Labs', website: 'https://velocelabs.io', bio: 'High-performance React applications.' },
      { id: 'company-saasflow', userId: 'user-saasflow', companyName: 'SaaSFlow', website: 'https://saasflow.com', bio: 'Modern SaaS automation.' },
      { id: 'company-insightcorp', userId: 'user-insightcorp', companyName: 'InsightCorp', website: 'https://insight.corp', bio: 'Enterprise AI workflows.' },
      { id: 'company-ciphervault', userId: 'user-ciphervault', companyName: 'CipherVault', website: 'https://ciphervault.secure', bio: 'Zero-knowledge cryptography.' },
      { id: 'company-hyperscale', userId: 'user-hyperscale', companyName: 'HyperScale', website: 'https://hyperscale.net', bio: 'Next-gen caching architecture.' }
    ],
    builders: [
      { id: 'builder-sophiachen', userId: 'user-sophiachen', fullName: 'Sophia Chen', githubUsername: 'sophiachen', bio: 'Senior Frontend Engineer focused on React performance optimization.', skills: ['Frontend', 'React', 'Performance'] }
    ],
    bounties: [
      {
        id: 'bounty-1',
        companyId: 'company-velocelabs',
        title: 'React Performance Optimization & Bundle Reduction',
        description: 'We are looking for a senior frontend performance engineer to optimize our core React application dashboard. Currently, our bundle size is over 4.5MB, and the initial paint takes 4.2 seconds on 3G connections. The goal is to optimize bundle chunking, eliminate render-blocking elements, implement virtualization for our infinite scroll table, and bring down the bundle size below 800KB.',
        category: 'Frontend',
        reward: 1000,
        platformFee: 66,
        netPayout: 934,
        status: 'SUBMITTED',
        paymentStatus: 'FUNDED',
        deadline: '2026-12-31',
        createdAt: '2026-08-20',
        updatedAt: '2026-08-20',
      },
      {
        id: 'bounty-2',
        companyId: 'company-saasflow',
        title: 'Idempotent Stripe Billing System Integration',
        description: 'Integrate Stripe Customer Portal and subscription billing with custom usage-based metering. We need the system to be robust against network failures and strictly idempotent, ensuring no customer is charged twice. This requires setting up robust webhook handlers with signing validation, retry logic, and transaction safety in PostgreSQL.',
        category: 'Backend',
        reward: 2500,
        platformFee: 165,
        netPayout: 2335,
        status: 'FUNDED',
        paymentStatus: 'FUNDED',
        deadline: '2026-11-30',
        createdAt: '2026-08-18',
        updatedAt: '2026-08-18',
      },
      {
        id: 'bounty-3',
        companyId: 'company-insightcorp',
        title: 'Intelligent AI Document-Processing Workflow Pipeline',
        description: 'Build a secure, serverless processing workflow that ingests structured and unstructured PDFs, parses them using a local or cloud-hosted LLM layout model, extracts tabular data, and exports standardized JSON formats. The pipeline must support high concurrency and have built-in validation for schema compliance.',
        category: 'AI / Machine Learning',
        reward: 5000,
        platformFee: 330,
        netPayout: 4670,
        status: 'FUNDED',
        paymentStatus: 'FUNDED',
        deadline: '2026-10-15',
        createdAt: '2026-08-22',
        updatedAt: '2026-08-22',
      },
      {
        id: 'bounty-4',
        companyId: 'company-ciphervault',
        title: 'Zero-Knowledge Cryptographic Access Protocol & Security Audit',
        description: 'CipherVault - Implement a zero-knowledge proof authentication protocol for our secure file storage vault. Builders must design and build a functional cryptographically-secure token exchange system that validates credentials without exposing keys. A short penetration-testing document verifying safety under common attack models is required.',
        category: 'Security',
        reward: 10000,
        platformFee: 660,
        netPayout: 9340,
        status: 'FUNDED',
        paymentStatus: 'FUNDED',
        deadline: '2026-10-31',
        createdAt: '2026-08-21',
        updatedAt: '2026-08-21',
      },
      {
        id: 'bounty-5',
        companyId: 'company-hyperscale',
        title: 'High-Throughput API Gateway & Cache Layer (100k+ req/sec)',
        description: 'We are seeking a systems architect to construct an ultra-low latency API Gateway with dynamic routing, rate-limiting, and an optimized Redis-based caching layer. The target is to sustain 100,000 concurrent requests per second with a p99 latency profile below 12 milliseconds.',
        category: 'DevOps & Scalability',
        reward: 25000,
        platformFee: 1650,
        netPayout: 23350,
        status: 'FUNDED',
        paymentStatus: 'FUNDED',
        deadline: '2026-09-30',
        createdAt: '2026-08-15',
        updatedAt: '2026-08-15',
      }
    ],
    claims: [],
    submissions: [
      {
        id: 'sol-seed-1',
        bountyId: 'bounty-1',
        builderId: 'builder-sophiachen',
        githubUrl: 'https://github.com/sophiachen/react-performance-optimized-dashboard',
        demoUrl: 'https://react-performance-optimized-dashboard.vercel.app',
        description: 'Reduced bundle sizes from 4.5MB to 710KB (gzipped) using dynamic component code-splitting, tree-shaking stale libraries, and lazy loading offscreen views. Resolved infinite scroll lag by implementing react-window virtualization. Measured LCP reduction to 1.8s.',
        submittedAt: '2026-08-22'
      }
    ],
    winners: [],
    payouts: [],
    applications: [],
    payments: [
      { id: 'pay_bounty-1', bountyId: 'bounty-1', reward: 1000, platformFee: 66, developerPayout: 934, fundingStatus: 'FUNDED', payoutStatus: 'UNPAID', createdAt: '2026-08-20' },
      { id: 'pay_bounty-2', bountyId: 'bounty-2', reward: 2500, platformFee: 165, developerPayout: 2335, fundingStatus: 'FUNDED', payoutStatus: 'UNPAID', createdAt: '2026-08-18' },
      { id: 'pay_bounty-3', bountyId: 'bounty-3', reward: 5000, platformFee: 330, developerPayout: 4670, fundingStatus: 'FUNDED', payoutStatus: 'UNPAID', createdAt: '2026-08-22' },
      { id: 'pay_bounty-4', bountyId: 'bounty-4', reward: 10000, platformFee: 660, developerPayout: 9340, fundingStatus: 'FUNDED', payoutStatus: 'UNPAID', createdAt: '2026-08-21' },
      { id: 'pay_bounty-5', bountyId: 'bounty-5', reward: 25000, platformFee: 1650, developerPayout: 23350, fundingStatus: 'FUNDED', payoutStatus: 'UNPAID', createdAt: '2026-08-15' }
    ],
    auditEvents: [
      {
        id: 'audit-init-1',
        eventType: 'SYSTEM_INITIALIZED',
        details: 'BountyLoop database initialized with sandbox demo seed listings.',
        createdAt: new Date().toISOString()
      }
    ]
  };
};

export class Database {
  private static instance: Database;
  private memoryData: DatabaseSchema | null = null;

  private constructor() {
    ensureDbDirectory();
    this.read();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public read(): DatabaseSchema {
    if (this.memoryData) {
      return this.memoryData;
    }

    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.memoryData = JSON.parse(raw);
      } else {
        const initial = getInitialData();
        this.write(initial);
        this.memoryData = initial;
      }

      // Auto-enrich legacy or incomplete data dynamically to support full workflow
      let changed = false;
      if (this.memoryData) {
        // Enforce all collections exist to prevent undefined reference crashes
        if (!this.memoryData.users) { this.memoryData.users = getInitialData().users || []; changed = true; }
        if (!this.memoryData.sessions) { this.memoryData.sessions = []; changed = true; }
        if (!this.memoryData.companies) { this.memoryData.companies = []; changed = true; }
        if (!this.memoryData.builders) { this.memoryData.builders = []; changed = true; }
        if (!this.memoryData.bounties) { this.memoryData.bounties = []; changed = true; }
        if (!this.memoryData.claims) { this.memoryData.claims = []; changed = true; }
        if (!this.memoryData.submissions) { this.memoryData.submissions = []; changed = true; }
        if (!this.memoryData.winners) { this.memoryData.winners = []; changed = true; }
        if (!this.memoryData.payouts) { this.memoryData.payouts = []; changed = true; }
        if (!this.memoryData.applications) { this.memoryData.applications = []; changed = true; }
        if (!this.memoryData.payments) { this.memoryData.payments = []; changed = true; }
        if (!this.memoryData.auditEvents) { this.memoryData.auditEvents = []; changed = true; }

        if (this.memoryData.companies.length === 0) {
          this.memoryData.companies = [
            { id: 'company-velocelabs', userId: 'user-velocelabs', companyName: 'Veloce Labs', website: 'https://velocelabs.io', bio: 'High-performance React applications.' },
            { id: 'company-saasflow', userId: 'user-saasflow', companyName: 'SaaSFlow', website: 'https://saasflow.com', bio: 'Modern SaaS automation.' },
            { id: 'company-insightcorp', userId: 'user-insightcorp', companyName: 'InsightCorp', website: 'https://insight.corp', bio: 'Enterprise AI workflows.' },
            { id: 'company-ciphervault', userId: 'user-ciphervault', companyName: 'CipherVault', website: 'https://ciphervault.secure', bio: 'Zero-knowledge cryptography.' },
            { id: 'company-hyperscale', userId: 'user-hyperscale', companyName: 'HyperScale', website: 'https://hyperscale.net', bio: 'Next-gen caching architecture.' }
          ];
          changed = true;
        }

        if (!this.memoryData.builders || this.memoryData.builders.length === 0) {
          this.memoryData.builders = [
            { id: 'builder-sophiachen', userId: 'user-sophiachen', fullName: 'Sophia Chen', githubUsername: 'sophiachen', bio: 'Senior Frontend Engineer focused on React performance optimization.', skills: ['Frontend', 'React', 'Performance'] }
          ];
          changed = true;
        }

        // Align bounty-1 through bounty-5 statuses
        if (this.memoryData.bounties) {
          this.memoryData.bounties.forEach(b => {
            if (b.id.startsWith('bounty-') && b.paymentStatus === 'UNFUNDED') {
              b.paymentStatus = 'FUNDED';
              // bounty-1 has a submission, so set to SUBMITTED
              if (b.id === 'bounty-1') {
                b.status = 'SUBMITTED';
              } else {
                b.status = 'FUNDED';
              }
              changed = true;
            }
          });
        }

        // Auto-seed corresponding payments if missing
        if (!this.memoryData.payments) {
          this.memoryData.payments = [];
          changed = true;
        }
        if (this.memoryData.payments.length === 0 && this.memoryData.bounties) {
          this.memoryData.bounties.forEach(b => {
            this.memoryData!.payments.push({
              id: `pay_${b.id}`,
              bountyId: b.id,
              reward: b.reward,
              platformFee: b.platformFee,
              developerPayout: b.netPayout,
              fundingStatus: 'FUNDED',
              payoutStatus: 'UNPAID',
              createdAt: b.createdAt
            });
          });
          changed = true;
        }

        if (changed) {
          this.write(this.memoryData);
        }
      }
    } catch (e) {
      console.error('Error reading database file, using initial memory data', e);
      this.memoryData = getInitialData();
    }

    return this.memoryData!;
  }

  public write(data: DatabaseSchema): void {
    this.memoryData = data;
    try {
      ensureDbDirectory();
      // Safe write: write to temp file first then rename
      const tempPath = `${DB_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_PATH);
    } catch (e) {
      console.error('Error writing database file', e);
    }
  }

  // Helper methods to modify individual collections
  public getUsers(): User[] {
    return this.read().users;
  }

  public saveUser(user: User): void {
    const data = this.read();
    const idx = data.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      data.users[idx] = user;
    } else {
      data.users.push(user);
    }
    this.write(data);
  }

  public getSessions(): Session[] {
    return this.read().sessions;
  }

  public saveSession(session: Session): void {
    const data = this.read();
    data.sessions.push(session);
    this.write(data);
  }

  public deleteSession(token: string): void {
    const data = this.read();
    data.sessions = data.sessions.filter((s) => s.token !== token);
    this.write(data);
  }

  public getCompanies(): Company[] {
    return this.read().companies;
  }

  public saveCompany(company: Company): void {
    const data = this.read();
    const idx = data.companies.findIndex((c) => c.id === company.id);
    if (idx !== -1) {
      data.companies[idx] = company;
    } else {
      data.companies.push(company);
    }
    this.write(data);
  }

  public getBuilders(): Builder[] {
    return this.read().builders;
  }

  public saveBuilder(builder: Builder): void {
    const data = this.read();
    const idx = data.builders.findIndex((b) => b.id === builder.id);
    if (idx !== -1) {
      data.builders[idx] = builder;
    } else {
      data.builders.push(builder);
    }
    this.write(data);
  }

  public getBounties(): Bounty[] {
    return this.read().bounties;
  }

  public saveBounty(bounty: Bounty): void {
    const data = this.read();
    const idx = data.bounties.findIndex((b) => b.id === bounty.id);
    if (idx !== -1) {
      data.bounties[idx] = bounty;
    } else {
      data.bounties.push(bounty);
    }
    this.write(data);
  }

  public getClaims(): Claim[] {
    return this.read().claims;
  }

  public saveClaim(claim: Claim): void {
    const data = this.read();
    const idx = data.claims.findIndex((c) => c.id === claim.id);
    if (idx !== -1) {
      data.claims[idx] = claim;
    } else {
      data.claims.push(claim);
    }
    this.write(data);
  }

  public getSubmissions(): Submission[] {
    return this.read().submissions;
  }

  public saveSubmission(submission: Submission): void {
    const data = this.read();
    const idx = data.submissions.findIndex((s) => s.id === submission.id);
    if (idx !== -1) {
      data.submissions[idx] = submission;
    } else {
      data.submissions.push(submission);
    }
    this.write(data);
  }

  public getWinners(): Winner[] {
    return this.read().winners;
  }

  public saveWinner(winner: Winner): void {
    const data = this.read();
    data.winners.push(winner);
    this.write(data);
  }

  public getPayouts(): Payout[] {
    return this.read().payouts;
  }

  public savePayout(payout: Payout): void {
    const data = this.read();
    const idx = data.payouts.findIndex((p) => p.id === payout.id);
    if (idx !== -1) {
      data.payouts[idx] = payout;
    } else {
      data.payouts.push(payout);
    }
    this.write(data);
  }

  public getApplications(): any[] {
    const data = this.read();
    if (!data.applications) {
      data.applications = [];
    }
    return data.applications;
  }

  public saveApplication(app: any): void {
    const data = this.read();
    if (!data.applications) {
      data.applications = [];
    }
    const idx = data.applications.findIndex((a) => a.id === app.id);
    if (idx !== -1) {
      data.applications[idx] = app;
    } else {
      data.applications.push(app);
    }
    this.write(data);
  }

  public getPayments(): any[] {
    const data = this.read();
    if (!data.payments) {
      data.payments = [];
    }
    return data.payments;
  }

  public savePayment(payment: any): void {
    const data = this.read();
    if (!data.payments) {
      data.payments = [];
    }
    const idx = data.payments.findIndex((p) => p.id === payment.id);
    if (idx !== -1) {
      data.payments[idx] = payment;
    } else {
      data.payments.push(payment);
    }
    this.write(data);
  }

  public getAuditEvents(): AuditEvent[] {
    return this.read().auditEvents;
  }

  public saveAuditEvent(event: AuditEvent): void {
    const data = this.read();
    data.auditEvents.push(event);
    this.write(data);
  }
}

export const db = Database.getInstance();
