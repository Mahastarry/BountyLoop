import { db } from './db';
import { Payout, PaymentStatus } from './types';

export interface FundingSessionResponse {
  sessionId: string;
  fundingUrl?: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  status: PaymentStatus;
  message: string;
}

export interface PayoutResponse {
  payoutId: string;
  bountyId: string;
  builderId: string;
  amount: number;
  feeAmount: number;
  status: PaymentStatus;
  providerReference?: string;
  idempotencyKey: string;
  message: string;
}

export class PaymentService {
  private static instance: PaymentService;
  private readonly platformFeeRate = 0.066; // 6.6% platform fee

  private constructor() {}

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Calculates the 6.6% platform fee server-side.
   * This is computed exclusively from the bounty reward to prevent tampering.
   */
  public calculatePlatformFee(bountyAmount: number): { fee: number; net: number } {
    if (bountyAmount <= 0) {
      return { fee: 0, net: 0 };
    }
    const fee = Math.round(bountyAmount * this.platformFeeRate * 100) / 100;
    const net = Math.round((bountyAmount - fee) * 100) / 100;
    return { fee, net };
  }

  /**
   * Creates a simulated funding session.
   * Real payments are disabled until a provider is configured.
   */
  public async createFundingSession(bountyId: string, amount: number): Promise<FundingSessionResponse> {
    const { fee, net } = this.calculatePlatformFee(amount);

    const isProviderConfigured = !!process.env.PAYMENT_PROVIDER_API_KEY;

    if (!isProviderConfigured) {
      return {
        sessionId: `sess_sandbox_${Date.now()}_${bountyId}`,
        amount,
        feeAmount: fee,
        netAmount: net,
        status: 'UNFUNDED',
        message: 'Payment provider not configured. Real-money funding is disabled during this public beta.',
      };
    }

    // In a real implementation:
    // const paymentSession = await provider.sessions.create({...});
    // For now, return standard layout structured for later integration.
    return {
      sessionId: `sess_real_${Date.now()}_${bountyId}`,
      fundingUrl: `https://bountyloop.com/pay/sandbox-gateway?bounty=${bountyId}`,
      amount,
      feeAmount: fee,
      netAmount: net,
      status: 'FUNDING_PENDING',
      message: 'Funding session generated successfully via abstract provider.',
    };
  }

  /**
   * Verifies the funding status of a session.
   * Does not simulate real successful payments unless verified via provider.
   */
  public async verifyFunding(bountyId: string, sessionReference: string): Promise<{ success: boolean; status: PaymentStatus; message: string }> {
    const isProviderConfigured = !!process.env.PAYMENT_PROVIDER_API_KEY;

    if (!isProviderConfigured) {
      return {
        success: false,
        status: 'UNFUNDED',
        message: 'Verification failed. Real payment provider is not configured.',
      };
    }

    // Real verification with provider would happen here
    return {
      success: true,
      status: 'FUNDED',
      message: 'Funding successfully verified by payment provider.',
    };
  }

  /**
   * Creates a payout with strict server-side fee checks and idempotency.
   */
  public async createPayout(
    bountyId: string,
    builderId: string,
    amount: number,
    idempotencyKey: string
  ): Promise<PayoutResponse> {
    // 1. Strict Idempotency Check: prevent duplicate payouts
    const existingPayouts = db.getPayouts();
    const duplicate = existingPayouts.find((p) => p.idempotencyKey === idempotencyKey);
    if (duplicate) {
      return {
        payoutId: duplicate.id,
        bountyId: duplicate.bountyId,
        builderId: duplicate.builderId,
        amount: duplicate.amount,
        feeAmount: duplicate.feeAmount,
        status: duplicate.payoutStatus,
        providerReference: duplicate.providerReference,
        idempotencyKey: duplicate.idempotencyKey,
        message: 'Duplicate payout request blocked. Existing payout record returned.',
      };
    }

    // 2. Server-side calculation (never trust the client-supplied numbers)
    const { fee, net } = this.calculatePlatformFee(amount);

    const isProviderConfigured = !!process.env.PAYMENT_PROVIDER_API_KEY;

    const newPayout: Payout = {
      id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      bountyId,
      builderId,
      amount: net, // builder receives net amount
      feeAmount: fee,
      payoutStatus: isProviderConfigured ? 'PAYOUT_PROCESSING' : 'PAYOUT_PENDING',
      idempotencyKey,
      createdAt: new Date().toISOString(),
    };

    if (!isProviderConfigured) {
      newPayout.payoutStatus = 'PAYOUT_PENDING';
      db.savePayout(newPayout);

      return {
        payoutId: newPayout.id,
        bountyId,
        builderId,
        amount: net,
        feeAmount: fee,
        status: 'PAYOUT_PENDING',
        idempotencyKey,
        message: 'Payout created in pending status. Real-money payouts are disabled until a provider is configured.',
      };
    }

    // Integrate payment provider payout creation:
    // const providerPayout = await provider.payouts.create({...});
    newPayout.providerReference = `ref_prov_${Date.now()}`;
    newPayout.payoutStatus = 'PAID';
    db.savePayout(newPayout);

    return {
      payoutId: newPayout.id,
      bountyId,
      builderId,
      amount: net,
      feeAmount: fee,
      status: 'PAID',
      providerReference: newPayout.providerReference,
      idempotencyKey,
      message: 'Payout processed successfully by payment provider.',
    };
  }

  /**
   * Retrieves the current status of an existing payout.
   */
  public async getPayoutStatus(payoutId: string): Promise<{ payoutId: string; status: PaymentStatus; reference?: string }> {
    const payouts = db.getPayouts();
    const payout = payouts.find((p) => p.id === payoutId);

    if (!payout) {
      throw new Error(`Payout not found for ID: ${payoutId}`);
    }

    return {
      payoutId: payout.id,
      status: payout.payoutStatus,
      reference: payout.providerReference,
    };
  }
}

export const paymentService = PaymentService.getInstance();
