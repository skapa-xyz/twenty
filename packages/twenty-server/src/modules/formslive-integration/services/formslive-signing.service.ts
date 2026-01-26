import { Injectable, Logger } from '@nestjs/common';

import { CustomError } from 'twenty-shared/utils';

import { FormsLiveClientService } from 'src/modules/formslive-integration/services/formslive-client.service';
import { FormsLiveFieldMapperService } from 'src/modules/formslive-integration/services/formslive-field-mapper.service';
import {
  FormsLiveExceptionCode,
  FormsLiveSigningStatus,
  BuyerData,
  AgentData,
} from 'src/modules/formslive-integration/types/formslive.types';

/**
 * Response from FormsLive when initiating remote signing
 */
type RemoteSigningResponse = {
  success: boolean;
  message?: string;
  signing_id?: number;
};

/**
 * Signing status response from FormsLive
 */
type SigningStatusResponse = {
  id: number;
  status: string;
  signers: Array<{
    signer: string;
    name: string;
    email: string;
    status: string;
    signed_at?: number;
  }>;
  created: number;
  updated: number;
};

/**
 * Service for managing FormsLive electronic signing workflows.
 *
 * FormsLive supports remote signing where documents are sent to signers
 * via email. Each signer receives a unique link to sign the document.
 *
 * The typical workflow is:
 * 1. Create and populate a form (FormsLiveFormService)
 * 2. Initiate remote signing with signer details
 * 3. Monitor signing status via webhooks
 * 4. Handle completion when all signers have signed
 *
 * @example
 * ```typescript
 * // Initiate signing for an engagement agreement
 * await signingService.initiateRemoteSigning(
 *   userId,
 *   workspaceId,
 *   formId,
 *   buyerData,
 *   agentData,
 *   'Please review and sign the Engagement Agreement'
 * );
 * ```
 */
@Injectable()
export class FormsLiveSigningService {
  private readonly logger = new Logger(FormsLiveSigningService.name);

  constructor(
    private readonly clientService: FormsLiveClientService,
    private readonly fieldMapperService: FormsLiveFieldMapperService,
  ) {}

  /**
   * Initiates remote signing for a form.
   *
   * This sends signing requests to all configured signers (typically the
   * Buyer and Agent) via email. Each receives a unique link to sign.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param formId - The FormsLive form ID
   * @param buyerData - Buyer information for signing
   * @param agentData - Agent information for signing
   * @param message - Optional message to include in signing email
   * @param subject - Optional custom email subject
   */
  async initiateRemoteSigning(
    userId: string,
    workspaceId: string,
    formId: number,
    buyerData: BuyerData,
    agentData: AgentData,
    message?: string,
    subject?: string,
  ): Promise<void> {
    // Get signer configuration
    const signers = this.fieldMapperService.getSignerConfiguration(
      buyerData,
      agentData,
    );

    if (signers.length === 0) {
      throw new CustomError(
        'No signers configured. At least one signer with an email is required.',
        'SIGNING_INITIATION_FAILED' as FormsLiveExceptionCode,
      );
    }

    this.logger.log(
      `Initiating remote signing for form ${formId} with ${signers.length} signers`,
    );

    const requestBody: Record<string, unknown> = {
      signers,
    };

    if (message) {
      requestBody.message = message;
    }

    if (subject) {
      requestBody.subject = subject;
    }

    const response = await this.clientService.post<RemoteSigningResponse>(
      userId,
      workspaceId,
      `/forms/${formId}/remotesign`,
      requestBody,
    );

    if (!response.success) {
      throw new CustomError(
        response.message ?? 'Failed to initiate remote signing',
        'SIGNING_INITIATION_FAILED' as FormsLiveExceptionCode,
      );
    }

    this.logger.log(`Successfully initiated remote signing for form ${formId}`);
  }

  /**
   * Gets the current signing status for a form.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param formId - The FormsLive form ID
   * @returns The current signing status and signer details
   */
  async getSigningStatus(
    userId: string,
    workspaceId: string,
    formId: number,
  ): Promise<{
    status: FormsLiveSigningStatus;
    signers: Array<{
      signer: string;
      name: string;
      email: string;
      status: string;
      signedAt?: Date;
    }>;
  }> {
    const response = await this.clientService.get<SigningStatusResponse>(
      userId,
      workspaceId,
      `/forms/${formId}/signing`,
    );

    // Map API status to our enum
    const statusMap: Record<string, FormsLiveSigningStatus> = {
      pending: 'pending',
      sent: 'sent',
      viewed: 'viewed',
      signed: 'signed',
      completed: 'completed',
      voided: 'voided',
    };

    return {
      status: statusMap[response.status.toLowerCase()] ?? 'pending',
      signers: response.signers.map((s) => ({
        signer: s.signer,
        name: s.name,
        email: s.email,
        status: s.status,
        signedAt: s.signed_at ? new Date(s.signed_at * 1000) : undefined,
      })),
    };
  }

  /**
   * Voids/cancels a signing request.
   *
   * This is useful when an engagement falls through or data needs to be corrected.
   * Once voided, the form can be modified and signing reinitiated.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param formId - The FormsLive form ID
   * @param reason - Optional reason for voiding
   */
  async voidSigning(
    userId: string,
    workspaceId: string,
    formId: number,
    reason?: string,
  ): Promise<void> {
    this.logger.log(`Voiding signing for form ${formId}`);

    await this.clientService.post(
      userId,
      workspaceId,
      `/forms/${formId}/void`,
      reason ? { reason } : undefined,
    );

    this.logger.log(`Successfully voided signing for form ${formId}`);
  }

  /**
   * Downloads the signed PDF document.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param formId - The FormsLive form ID
   * @returns PDF document as buffer
   */
  async downloadSignedPdf(
    userId: string,
    workspaceId: string,
    formId: number,
  ): Promise<Buffer> {
    // Note: This may need special handling for binary response
    const response = await this.clientService.get<ArrayBuffer>(
      userId,
      workspaceId,
      `/forms/${formId}/pdf`,
      {
        responseType: 'arraybuffer',
      },
    );

    return Buffer.from(response);
  }

  /**
   * Resends signing email to a specific signer.
   *
   * Useful when a signer reports not receiving the original email.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param formId - The FormsLive form ID
   * @param signerEmail - Email of the signer to resend to
   */
  async resendSigningEmail(
    userId: string,
    workspaceId: string,
    formId: number,
    signerEmail: string,
  ): Promise<void> {
    this.logger.log(
      `Resending signing email for form ${formId} to ${signerEmail}`,
    );

    await this.clientService.post(
      userId,
      workspaceId,
      `/forms/${formId}/resend`,
      { email: signerEmail },
    );

    this.logger.log(`Successfully resent signing email to ${signerEmail}`);
  }
}
