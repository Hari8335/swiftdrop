export type MerchantStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface MerchantSummary {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phoneNumber: string;
  status: MerchantStatus;
  rejectionReason: string | null;
  createdAt: string;
  credentialRecoveryAvailable?: boolean;
}

export interface MerchantPage {
  content: MerchantSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface MerchantRejectionRequest {
  reason: string;
}

export interface MerchantApprovalResponse {
  merchant: MerchantSummary;
  clientId: string;
  clientSecret?: string;
}

/** List filter for the admin merchant table. `ALL` omits the optional `status` query parameter. */
export type MerchantListFilter = MerchantStatus | 'ALL';

/**
 * One-time credential handoff held only in component memory after an approve or recover response.
 * Never persisted, logged, or re-fetched.
 */
export interface MerchantCredentialHandoff {
  merchantId: string;
  businessName: string;
  clientId: string;
  clientSecret: string | null;
  kind: 'approval' | 'recovery';
}
