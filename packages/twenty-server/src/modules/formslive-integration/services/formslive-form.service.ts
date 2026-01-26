import { Injectable, Logger } from '@nestjs/common';

import { CustomError } from 'twenty-shared/utils';

import { FormsLiveClientService } from 'src/modules/formslive-integration/services/formslive-client.service';
import { FormsLiveTokenService } from 'src/modules/formslive-integration/services/formslive-token.service';
import { FormsLiveFieldMapperService } from 'src/modules/formslive-integration/services/formslive-field-mapper.service';
import {
  FormsLiveForm,
  FormsLiveExceptionCode,
  BuyerData,
  AgentData,
} from 'src/modules/formslive-integration/types/formslive.types';

/**
 * Response from FormsLive when creating a form
 */
type CreateFormResponse = {
  id: number;
  name: string;
  template_id: number;
  template_name: string;
  finalised: boolean;
  user_id: number;
  agency_id: number;
  created: number;
  updated: number;
};

/**
 * Service for creating and managing FormsLive forms.
 *
 * This service handles the core form operations:
 * - Creating forms from templates
 * - Populating fields with data
 * - Finalizing forms for signing
 *
 * The typical workflow is:
 * 1. Create a form from a template
 * 2. Populate the form with Buyer/Agent data
 * 3. Initiate remote signing (handled by FormsLiveSigningService)
 *
 * @example
 * ```typescript
 * // Create and populate an engagement agreement
 * const form = await formService.createEngagementForm(
 *   userId,
 *   workspaceId,
 *   opportunityId,
 *   buyerData,
 *   agentData
 * );
 * ```
 */
@Injectable()
export class FormsLiveFormService {
  private readonly logger = new Logger(FormsLiveFormService.name);

  constructor(
    private readonly clientService: FormsLiveClientService,
    private readonly tokenService: FormsLiveTokenService,
    private readonly fieldMapperService: FormsLiveFieldMapperService,
  ) {}

  /**
   * Creates a new form from a template.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param templateId - The FormsLive template ID to use
   * @param formName - Name for the new form
   * @returns The created form details
   */
  async createForm(
    userId: string,
    workspaceId: string,
    templateId: number,
    formName: string,
  ): Promise<FormsLiveForm> {
    this.logger.log(`Creating form from template ${templateId}: "${formName}"`);

    const response = await this.clientService.post<CreateFormResponse>(
      userId,
      workspaceId,
      '/forms/',
      {
        name: formName,
        template_id: templateId,
      },
    );

    this.logger.log(`Created form ${response.id}: "${response.name}"`);

    return {
      id: response.id,
      name: response.name,
      finalised: response.finalised,
      templateId: response.template_id,
      templateName: response.template_name,
      userId: response.user_id,
      agencyId: response.agency_id,
      created: response.created,
      updated: response.updated,
    };
  }

  /**
   * Populates a form with field values.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param formId - The FormsLive form ID
   * @param fields - Map of field names to values
   */
  async populateFields(
    userId: string,
    workspaceId: string,
    formId: number,
    fields: Record<string, string>,
  ): Promise<void> {
    this.logger.log(
      `Populating ${Object.keys(fields).length} fields on form ${formId}`,
    );

    // FormsLive expects fields to be updated one at a time or in bulk
    // Using the fields endpoint with a PUT request
    await this.clientService.put(
      userId,
      workspaceId,
      `/forms/${formId}/fields`,
      { fields },
    );

    this.logger.log(`Successfully populated fields on form ${formId}`);
  }

  /**
   * Gets the current field values from a form.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param formId - The FormsLive form ID
   * @returns Map of field names to current values
   */
  async getFormFields(
    userId: string,
    workspaceId: string,
    formId: number,
  ): Promise<Record<string, string>> {
    const response = await this.clientService.get<{
      fields: Record<string, string>;
    }>(userId, workspaceId, `/forms/${formId}/fields`);

    return response.fields;
  }

  /**
   * Gets a form by ID.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param formId - The FormsLive form ID
   * @returns The form details
   */
  async getForm(
    userId: string,
    workspaceId: string,
    formId: number,
  ): Promise<FormsLiveForm> {
    const response = await this.clientService.get<CreateFormResponse>(
      userId,
      workspaceId,
      `/forms/${formId}`,
    );

    return {
      id: response.id,
      name: response.name,
      finalised: response.finalised,
      templateId: response.template_id,
      templateName: response.template_name,
      userId: response.user_id,
      agencyId: response.agency_id,
      created: response.created,
      updated: response.updated,
    };
  }

  /**
   * Creates an engagement agreement form, populated with Buyer and Agent data.
   *
   * This is the main method called by the engagement stage listener.
   * It handles the complete workflow:
   * 1. Looks up the user's selected engagement template
   * 2. Creates a form from that template
   * 3. Maps Buyer data to form fields
   * 4. Populates the form with mapped data
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param opportunityId - The opportunity ID (for form naming)
   * @param buyerData - Buyer information to populate
   * @param agentData - Agent information to populate
   * @returns The created and populated form
   */
  async createEngagementForm(
    userId: string,
    workspaceId: string,
    opportunityId: string,
    buyerData: BuyerData,
    agentData: AgentData,
  ): Promise<FormsLiveForm> {
    // Get the user's connection to find their selected template
    const connection = await this.tokenService.getConnection(
      userId,
      workspaceId,
    );

    if (!connection) {
      throw new CustomError(
        'FormsLive connection not found',
        'CONNECTION_NOT_FOUND' as FormsLiveExceptionCode,
      );
    }

    if (!connection.engagementTemplateId) {
      throw new CustomError(
        'No engagement template configured. Please select a template in settings.',
        'TEMPLATE_NOT_FOUND' as FormsLiveExceptionCode,
      );
    }

    // Create form name with buyer name for easy identification
    const formName = `Engagement Agreement - ${buyerData.name}`;

    // Create the form
    const form = await this.createForm(
      userId,
      workspaceId,
      connection.engagementTemplateId,
      formName,
    );

    // Map Buyer data to form fields based on state
    const fieldValues = this.fieldMapperService.mapBuyerToFormFields(
      buyerData,
      agentData,
      connection.australianState,
    );

    // Populate the form with data
    await this.populateFields(userId, workspaceId, form.id, fieldValues);

    this.logger.log(
      `Created engagement form ${form.id} for opportunity ${opportunityId}`,
    );

    return form;
  }

  /**
   * Deletes a form.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param formId - The FormsLive form ID
   */
  async deleteForm(
    userId: string,
    workspaceId: string,
    formId: number,
  ): Promise<void> {
    await this.clientService.delete(userId, workspaceId, `/forms/${formId}`);

    this.logger.log(`Deleted form ${formId}`);
  }
}
