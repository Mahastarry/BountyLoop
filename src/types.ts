export type BountyCategory = 'Frontend' | 'Backend' | 'Fullstack' | 'Security' | 'AI / Machine Learning' | 'DevOps & Scalability';

export interface Bounty {
  id: string;
  title: string;
  company: string;
  description: string;
  reward: number; // in USD
  deadline: string; // YYYY-MM-DD
  category: BountyCategory;
  requirements: string[]; // list of requirements
  isDemo: boolean;
  status: 'open' | 'completed';
  createdAt: string;
  contactEmail: string;
}

export interface Solution {
  id: string;
  bountyId: string;
  name: string;
  email: string;
  githubUrl: string;
  demoUrl?: string;
  description: string;
  submittedAt: string;
}
