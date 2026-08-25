export interface User {
  id: string;
  name: string;
  email: string;
  role: 'COMPANY' | 'BUILDER' | 'ADMIN';
}

export interface Bounty {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  category: string;
  reward: number;
  platformFee: number;
  netPayout: number;
  status: 'DRAFT' | 'PUBLISHED' | 'FUNDED' | 'CLAIMED' | 'SUBMITTED' | 'APPROVED' | 'PAYOUT_PENDING' | 'PAID';
  paymentStatus: 'UNFUNDED' | 'FUNDING_PENDING' | 'FUNDED' | 'PAYOUT_PENDING' | 'PAYOUT_PROCESSING' | 'PAID' | 'PAYOUT_FAILED' | 'REFUNDED';
  githubRepoUrl?: string;
  githubIssueId?: string;
  githubPrUrl?: string;
  claimsCount: number;
  submissionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  bountyId: string;
  builderId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
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

export interface AuditEvent {
  id: string;
  bountyId?: string;
  eventType: string;
  details: string;
  userId?: string;
  createdAt: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('bountyloop_auth_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('bountyloop_auth_token', token);
    } else {
      localStorage.removeItem('bountyloop_auth_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(path, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  // Auth API
  public async register(payload: any): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(data.token);
    return data;
  }

  public async login(payload: any): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(data.token);
    return data;
  }

  public async googleLogin(payload: { email: string; name: string; googleId: string }): Promise<{ token: string; user: User; isNew: boolean }> {
    const data = await this.request<{ token: string; user: User; isNew: boolean }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(data.token);
    return data;
  }

  public async updateProfile(payload: any): Promise<{ user: User; profile: any }> {
    return this.request<{ user: User; profile: any }>('/api/auth/profile/update', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async getMe(): Promise<{ user: User; profile: any } | null> {
    if (!this.token) return null;
    try {
      return await this.request<{ user: User; profile: any }>('/api/auth/me');
    } catch (e) {
      this.setToken(null);
      return null;
    }
  }

  public logout(): void {
    this.setToken(null);
  }

  // Bounties API
  public async getBounties(): Promise<Bounty[]> {
    return this.request<Bounty[]>('/api/bounties');
  }

  public async getBounty(id: string): Promise<{
    bounty: Bounty;
    claims: Claim[];
    submissions: Submission[];
    winner?: any;
    auditTrail: AuditEvent[];
  }> {
    return this.request<{
      bounty: Bounty;
      claims: Claim[];
      submissions: Submission[];
      winner?: any;
      auditTrail: AuditEvent[];
    }>(`/api/bounties/${id}`);
  }

  public async createBounty(payload: any): Promise<Bounty> {
    return this.request<Bounty>('/api/bounties', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async claimBounty(id: string, payload?: { message: string; experience: string }): Promise<Claim> {
    return this.request<Claim>(`/api/bounties/${id}/claim`, {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : undefined
    });
  }

  public async approveClaim(bountyId: string, claimId: string): Promise<any> {
    return this.request<any>(`/api/bounties/${bountyId}/claims/${claimId}/approve`, {
      method: 'POST'
    });
  }

  public async submitSolution(bountyId: string, payload: any): Promise<Submission> {
    return this.request<Submission>(`/api/bounties/${bountyId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async approveSubmission(bountyId: string, payload: { submissionId: string; idempotencyKey?: string }): Promise<any> {
    return this.request<any>(`/api/bounties/${bountyId}/approve-submission`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async rejectSubmission(bountyId: string, reason: string): Promise<any> {
    return this.request<any>(`/api/bounties/${bountyId}/reject-submission`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  public async confirmPaymentDeposited(bountyId: string): Promise<any> {
    return this.request<any>(`/api/bounties/${bountyId}/payment-deposited`, {
      method: 'POST'
    });
  }

  public async getDeveloperApplications(): Promise<any[]> {
    return this.request<any[]>('/api/my-applications');
  }

  public async getCreatorApplications(): Promise<any[]> {
    return this.request<any[]>('/api/creator/applications');
  }
}

export const api = new ApiService();
