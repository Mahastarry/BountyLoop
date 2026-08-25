import crypto from 'crypto';
import { db } from './db';

export class GitHubService {
  private static instance: GitHubService;

  private constructor() {}

  public static getInstance(): GitHubService {
    if (!GitHubService.instance) {
      GitHubService.instance = new GitHubService();
    }
    return GitHubService.instance;
  }

  /**
   * Verifies the HMAC-SHA256 signature sent by GitHub in the x-hub-signature-256 header.
   */
  public verifySignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) {
      return false;
    }

    try {
      // signature format is sha256=HEX_DIGEST
      const parts = signature.split('=');
      if (parts.length !== 2 || parts[0] !== 'sha256') {
        return false;
      }

      const receivedHash = parts[1];
      const computedHash = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(computedHash));
    } catch (e) {
      console.error('Error verifying GitHub signature:', e);
      return false;
    }
  }

  /**
   * Extracts repository and PR/Issue info from URLs.
   */
  public parseGitHubUrl(url: string): { owner: string; repo: string; type?: 'pull' | 'issue'; number?: number } | null {
    if (!url) return null;

    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/(pull|issues)\/(\d+))?/);
      if (!match) return null;

      const [,, owner, repo, type, number] = match;
      return {
        owner,
        repo,
        type: type === 'pull' ? 'pull' : type === 'issues' ? 'issue' : undefined,
        number: number ? parseInt(number, 10) : undefined,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Processes a webhook payload and updates corresponding bounties.
   * Logs audit events for important issue or PR events.
   */
  public processWebhookEvent(event: string, payload: any): { processed: boolean; message: string } {
    const auditId = `audit_gh_${Date.now()}`;

    // Look for issue closure or pull request merge/close events
    if (event === 'issues' && payload.action === 'closed') {
      const issueUrl = payload.issue?.html_url;
      const issueNumber = payload.issue?.number;
      
      // Find bounty linked to this issue
      const bounties = db.getBounties();
      const bounty = bounties.find((b) => b.githubIssueId === String(issueNumber) || b.description.includes(issueUrl));

      if (bounty) {
        db.saveAuditEvent({
          id: auditId,
          bountyId: bounty.id,
          eventType: 'GITHUB_ISSUE_CLOSED',
          details: `GitHub Issue #${issueNumber} closed by ${payload.sender?.login}. Ready for review.`,
          createdAt: new Date().toISOString()
        });

        return {
          processed: true,
          message: `Linked bounty ${bounty.id} notified of issue #${issueNumber} closure.`
        };
      }
    }

    if (event === 'pull_request' && (payload.action === 'closed' || payload.action === 'opened')) {
      const prUrl = payload.pull_request?.html_url;
      const prNumber = payload.pull_request?.number;
      const isMerged = payload.pull_request?.merged;

      const bounties = db.getBounties();
      const bounty = bounties.find((b) => b.githubPrUrl === prUrl || b.description.includes(prUrl));

      if (bounty) {
        const eventType = isMerged ? 'GITHUB_PR_MERGED' : payload.action === 'closed' ? 'GITHUB_PR_CLOSED' : 'GITHUB_PR_OPENED';
        const details = isMerged 
          ? `GitHub PR #${prNumber} merged successfully by ${payload.sender?.login}.`
          : `GitHub PR #${prNumber} ${payload.action} by ${payload.sender?.login}.`;

        db.saveAuditEvent({
          id: auditId,
          bountyId: bounty.id,
          eventType,
          details,
          createdAt: new Date().toISOString()
        });

        return {
          processed: true,
          message: `Linked bounty ${bounty.id} notified of PR #${prNumber} status update.`
        };
      }
    }

    // Default logging for generic webhooks
    db.saveAuditEvent({
      id: auditId,
      eventType: 'GITHUB_WEBHOOK_RECEIVED',
      details: `GitHub webhook event '${event}' with action '${payload.action || 'unknown'}' logged.`,
      createdAt: new Date().toISOString()
    });

    return {
      processed: true,
      message: `Webhook event '${event}' logged successfully.`
    };
  }

  /**
   * Prepares the architecture to post the shareable BountyLoop link automatically to the linked GitHub issue as a comment.
   * This handles authenticating with GitHub and adding the comment when a bounty is APPROVED/live.
   */
  public async postBountyLinkToGitHubIssue(bountyId: string): Promise<{ success: boolean; message: string }> {
    const bounties = db.getBounties();
    const bounty = bounties.find((b) => b.id === bountyId);
    if (!bounty) {
      return { success: false, message: 'Bounty not found' };
    }

    const githubUrl = bounty.githubRepoUrl;
    if (!githubUrl) {
      return { success: false, message: 'No GitHub URL linked to this bounty' };
    }

    const parsed = this.parseGitHubUrl(githubUrl);
    if (!parsed || !parsed.owner || !parsed.repo) {
      return { success: false, message: 'Failed to parse linked GitHub repository/issue URL' };
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.warn(`[GitHub Architecture] GITHUB_TOKEN environment variable is missing. Comment auto-posting is skipped, but architecture is fully initialized.`);
      return { 
        success: false, 
        message: 'GITHUB_TOKEN environment variable is missing. Auto-posting is staged and fully initialized, pending credential configuration.' 
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || '';
    const bountyLink = `${siteUrl}/bounties/${bounty.id}`;
    const commentBody = `### 🚀 Bounty Active on BountyLoop\n\nA reward pool of **$${bounty.reward.toLocaleString()}** has been funded and opened on BountyLoop for this issue.\n\n👉 [**View and Apply for this Bounty on BountyLoop**](${bountyLink})\n\n---\n*Vetted, tracked, and secured via BountyLoop.*`;

    try {
      // Determined issue or PR number
      const number = parsed.number;
      if (!number) {
        return { success: false, message: 'GitHub issue or PR number could not be determined from the link.' };
      }

      // Real GitHub API call endpoint
      const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues/${number}/comments`;
      
      console.log(`[GitHub Architecture] Auto-posting comment to: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body: commentBody })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GitHub API returned status ${response.status}: ${errText}`);
      }

      db.saveAuditEvent({
        id: `audit_gh_post_${Date.now()}`,
        bountyId: bounty.id,
        eventType: 'GITHUB_COMMENT_POSTED',
        details: `Successfully auto-posted BountyLoop link to GitHub Issue #${number}.`,
        createdAt: new Date().toISOString()
      });

      return { success: true, message: 'BountyLoop link posted successfully as a GitHub issue comment.' };
    } catch (error: any) {
      console.error('[GitHub Architecture] Error posting to GitHub:', error);
      return { success: false, message: `Failed to post GitHub comment: ${error.message}` };
    }
  }
}

export const githubService = GitHubService.getInstance();
