export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'COMPANY' | 'BUILDER' | 'ADMIN';
  createdAt: string;
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface Company {
  id: string;
  userId: string;
  companyName: string;
  website?: string;
  bio?: string;
  logoUrl?: string;
}

export interface Builder {
  id: string;
  userId: string;
  fullName: string;
  githubUsername: string;
  bio?: string;
  portfolioUrl?: string;
  skills: string[];
}

export type BountyStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'PENDING REVIEW'
  | 'APPROVED'
  | 'FUNDING REQUIRED'
  | 'FUNDED'
  | 'CLAIMED'
  | 'IN PROGRESS'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CLOSED'
  | 'PAID';

export type PaymentStatus =
  | 'UNFUNDED'
  | 'FUNDING_PENDING'
  | 'FUNDED'
  | 'PAYOUT_PENDING'
  | 'PAYOUT_PROCESSING'
  | 'PAID'
  | 'PAYOUT_FAILED'
  | 'REFUNDED';

export interface Bounty {
  id: string;
  companyId: string;
  companyName?: string; // added for direct creation tracking
  title: string;
  description: string;
  requirements?: string; // added for detailed requirements
  technology?: string; // added for details
  acceptanceCriteria?: string; // added for details
  category: string;
  reward: number;
  platformFee: number;
  netPayout: number;
  status: BountyStatus;
  paymentStatus: PaymentStatus;
  deadline: string;
  githubRepoUrl?: string;
  githubIssueId?: string;
  githubPrUrl?: string;
  isDemo?: boolean; // added for demo marking
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  bountyId: string;
  builderId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
  experience?: string;
  createdAt: string;
}

export interface Application {
  id: string;
  bountyId: string;
  developerId: string; // references builderId or userId
  developerName: string;
  developerEmail: string;
  githubUsername: string;
  bio?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
  experience?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  bountyId: string;
  developerId?: string; // references builderId where applicable
  reward: number;
  platformFee: number;
  developerPayout: number;
  fundingStatus: 'UNFUNDED' | 'FUNDED';
  payoutStatus: 'UNPAID' | 'PAID';
  paymentDate?: string;
  payoutDate?: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  bountyId: string;
  builderId: string;
  githubUrl: string;
  demoUrl?: string;
  description: string;
  submittedAt: string;
}

export interface Winner {
  id: string;
  bountyId: string;
  submissionId: string;
  builderId: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  bountyId: string;
  builderId: string;
  amount: number;
  feeAmount: number;
  payoutStatus: PaymentStatus;
  providerReference?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  bountyId?: string;
  eventType: string;
  details: string;
  userId?: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  companies: Company[];
  builders: Builder[];
  bounties: Bounty[];
  claims: Claim[];
  submissions: Submission[];
  winners: Winner[];
  payouts: Payout[];
  applications: Application[]; // clean applications structure
  payments: Payment[]; // clean payments structure
  auditEvents: AuditEvent[];
}
