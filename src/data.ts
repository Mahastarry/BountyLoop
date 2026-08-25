import { Bounty } from './types';

export const INITIAL_BOUNTIES: Bounty[] = [
  {
    id: 'bounty-1',
    title: 'React Performance Optimization & Bundle Reduction',
    company: 'Veloce Labs',
    description: 'We are looking for a senior frontend performance engineer to optimize our core React application dashboard. Currently, our bundle size is over 4.5MB, and the initial paint takes 4.2 seconds on 3G connections. The goal is to optimize bundle chunking, eliminate render-blocking elements, implement virtualization for our infinite scroll table, and bring down the bundle size below 800KB.',
    reward: 1000,
    deadline: '2026-09-15',
    category: 'Frontend',
    requirements: [
      'Reduce the main bundle size to under 800KB (gzipped).',
      'Optimize initial loading times (LCP < 2.5s on slow 3G).',
      'Implement windowing/virtualization for list components of 10,000+ items.',
      'Provide a comprehensive build analyzer report detailing before/after metrics.'
    ],
    isDemo: true,
    status: 'open',
    createdAt: '2026-08-20',
    contactEmail: 'engineering@velocelabs.co'
  },
  {
    id: 'bounty-2',
    title: 'Idempotent Stripe Billing System Integration',
    company: 'SaaSFlow Inc.',
    description: 'Integrate Stripe Customer Portal and subscription billing with custom usage-based metering. We need the system to be robust against network failures and strictly idempotent, ensuring no customer is charged twice. This requires setting up robust webhook handlers with signing validation, retry logic, and transaction safety in PostgreSQL.',
    reward: 2500,
    deadline: '2026-09-30',
    category: 'Backend',
    requirements: [
      'Design an idempotent webhook processing pipeline with database locks.',
      'Support flat-rate + usage-based pricing models via Stripe Metering.',
      'Graceful handling of failed charges, subscription grace periods, and card updates.',
      'Comprehensive integration tests using Stripe CLI mockup.'
    ],
    isDemo: true,
    status: 'open',
    createdAt: '2026-08-18',
    contactEmail: 'payments@saasflow.io'
  },
  {
    id: 'bounty-3',
    title: 'Intelligent AI Document-Processing Workflow Pipeline',
    company: 'Insight Corp',
    description: 'Build a secure, serverless processing workflow that ingests structured and unstructured PDFs, parses them using a local or cloud-hosted LLM layout model, extracts tabular data, and exports standardized JSON formats. The pipeline must support high concurrency and have built-in validation for schema compliance.',
    reward: 5000,
    deadline: '2026-10-10',
    category: 'AI / Machine Learning',
    requirements: [
      'Extract layout-aware tabular data from PDFs with >98% accuracy.',
      'Implement an automated validation layer to check schemas and data types.',
      'Handle nested multi-page documents up to 100 pages in parallel under 2 minutes.',
      'Include a complete evaluation script running over a provided dataset of 50 documents.'
    ],
    isDemo: true,
    status: 'open',
    createdAt: '2026-08-22',
    contactEmail: 'ai-bounties@insightcorp.ai'
  },
  {
    id: 'bounty-4',
    title: 'Zero-Knowledge Cryptographic Access Protocol & Security Audit',
    company: 'CipherVault',
    description: 'Implement a zero-knowledge proof authentication protocol for our secure file storage vault. Builders must design and build a functional cryptographically-secure token exchange system that validates credentials without exposing keys. A short penetration-testing document verifying safety under common attack models is required.',
    reward: 10000,
    deadline: '2026-10-25',
    category: 'Security',
    requirements: [
      'Implement a proof-of-concept cryptographic credential handshake.',
      'Provide mathematical proofs of zero-knowledge assertions used.',
      'Secure implementation of crypto libraries preventing timing attacks.',
      'Provide a security analysis checklist including replay, MITM, and side-channel mitigations.'
    ],
    isDemo: true,
    status: 'open',
    createdAt: '2026-08-21',
    contactEmail: 'security@ciphervault.net'
  },
  {
    id: 'bounty-5',
    title: 'High-Throughput API Gateway & Cache Layer (100k+ req/sec)',
    company: 'HyperScale Systems',
    description: 'We are seeking a systems architect to construct a ultra-low latency API Gateway with dynamic routing, rate-limiting, and an optimized Redis-based caching layer. The target is to sustain 100,000 concurrent requests per second with a p99 latency profile below 12 milliseconds.',
    reward: 25000,
    deadline: '2026-11-01',
    category: 'DevOps & Scalability',
    requirements: [
      'Sustain 100,000+ requests/sec under synthetic load testing.',
      'p99 latency profile strictly under 12ms under peak stress.',
      'Implement Token Bucket rate limiting with dynamic IP/API Key allocation.',
      'Produce repeatable infrastructure code (Docker/Kubernetes manifests) with custom Prometheus metrics dashboards.'
    ],
    isDemo: true,
    status: 'open',
    createdAt: '2026-08-15',
    contactEmail: 'architect@hyperscale.io'
  }
];
