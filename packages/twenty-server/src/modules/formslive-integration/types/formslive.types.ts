/**
 * FormsLive API response types and exception codes.
 *
 * These types are based on the FormsLive API documentation
 * and provide type safety for API interactions.
 */

/**
 * Error codes specific to FormsLive integration
 */
export type FormsLiveExceptionCode =
  | 'CONNECTION_NOT_FOUND'
  | 'TOKEN_INVALID'
  | 'ENCRYPTION_NOT_CONFIGURED'
  | 'API_REQUEST_FAILED'
  | 'TEMPLATE_NOT_FOUND'
  | 'FORM_CREATION_FAILED'
  | 'SIGNING_INITIATION_FAILED'
  | 'WEBHOOK_SIGNATURE_INVALID';

/**
 * FormsLive template as returned from the API
 */
export type FormsLiveTemplate = {
  id: number;
  name: string;
  code: string;
  cost: number;
  active: boolean;
  templateGroupId: number;
  templateGroupName: string;
};

/**
 * FormsLive template group from the API
 */
export type FormsLiveTemplateGroup = {
  id: number;
  name: string;
  type: string;
  templates: Array<{
    id: number;
    name: string;
    code: string;
    cost: number;
    active: boolean;
    template_group_id: number;
  }>;
};

/**
 * FormsLive form field definition
 */
export type FormsLiveFormField = {
  displayName: string;
  name: string;
  required: boolean;
  type?: string;
  value?: string;
};

/**
 * FormsLive form as returned from the API
 */
export type FormsLiveForm = {
  id: number;
  name: string;
  finalised: boolean;
  templateId: number;
  templateName: string;
  userId: number;
  agencyId: number;
  created: number;
  updated: number;
};

/**
 * FormsLive signing request for remote signing
 */
export type FormsLiveRemoteSigningRequest = {
  signers: Array<{
    signer: string;
    name: string;
    email: string;
  }>;
  message?: string;
  subject?: string;
};

/**
 * FormsLive signing status
 */
export type FormsLiveSigningStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'completed'
  | 'voided';

/**
 * FormsLive webhook event types
 */
export type FormsLiveWebhookEventType =
  | 'form.create'
  | 'form.update'
  | 'form.sign'
  | 'form.remotesign'
  | 'form.finalise';

/**
 * FormsLive webhook payload structure
 */
export type FormsLiveWebhookPayload = {
  id: string;
  type: FormsLiveWebhookEventType;
  payload: {
    id: number;
    name: string;
    finalised: boolean;
    template_id: number;
    template_name: string;
    user_id: number;
    agency_id: number;
    created: number;
    updated: number;
  };
};

/**
 * Buyer data for field mapping
 */
export type BuyerData = {
  name: string;
  email?: string;
  phone?: string;
  engagementFee?: number;
  commissionRate?: number;
  solicitorName?: string;
  solicitorContact?: string;
  mortgageBrokerName?: string;
  mortgageBrokerContact?: string;
};

/**
 * Agent data for field mapping
 */
export type AgentData = {
  displayName: string;
  email?: string;
  phone?: string;
};
