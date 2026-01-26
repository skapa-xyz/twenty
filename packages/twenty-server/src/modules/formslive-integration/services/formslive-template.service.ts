import { Injectable, Logger } from '@nestjs/common';

import { FormsLiveClientService } from 'src/modules/formslive-integration/services/formslive-client.service';
import {
  FormsLiveTemplate,
  FormsLiveTemplateGroup,
  FormsLiveFormField,
} from 'src/modules/formslive-integration/types/formslive.types';

/**
 * Service for discovering and managing FormsLive templates.
 *
 * FormsLive organizes templates into groups (e.g., "Buyers Agent Forms",
 * "Contracts", etc.). This service provides methods to:
 * - List all available templates for a user
 * - Get detailed field information for a template
 * - Help users select which template to use for engagement agreements
 *
 * @example
 * ```typescript
 * // List all templates
 * const templates = await templateService.listTemplates(userId, workspaceId);
 *
 * // Get fields for a specific template
 * const fields = await templateService.getTemplateFields(userId, workspaceId, 12345);
 * ```
 */
@Injectable()
export class FormsLiveTemplateService {
  private readonly logger = new Logger(FormsLiveTemplateService.name);

  constructor(private readonly clientService: FormsLiveClientService) {}

  /**
   * Lists all available templates for a user.
   *
   * Templates are returned from FormsLive in a nested structure (groups containing
   * templates). This method flattens that structure for easier consumption.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @returns Flattened array of templates with group information
   */
  async listTemplates(
    userId: string,
    workspaceId: string,
  ): Promise<FormsLiveTemplate[]> {
    const response = await this.clientService.get<FormsLiveTemplateGroup[]>(
      userId,
      workspaceId,
      '/templates/',
    );

    // Flatten the nested structure
    return response.flatMap((group) =>
      group.templates.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        cost: t.cost,
        active: t.active,
        templateGroupId: t.template_group_id,
        templateGroupName: group.name,
      })),
    );
  }

  /**
   * Lists templates filtered to only active ones.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @returns Array of active templates only
   */
  async listActiveTemplates(
    userId: string,
    workspaceId: string,
  ): Promise<FormsLiveTemplate[]> {
    const templates = await this.listTemplates(userId, workspaceId);

    return templates.filter((t) => t.active);
  }

  /**
   * Searches templates by name (case-insensitive).
   *
   * Useful for finding engagement agreement templates.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param searchTerm - Term to search for in template names
   * @returns Templates matching the search term
   */
  async searchTemplates(
    userId: string,
    workspaceId: string,
    searchTerm: string,
  ): Promise<FormsLiveTemplate[]> {
    const templates = await this.listActiveTemplates(userId, workspaceId);
    const lowerSearch = searchTerm.toLowerCase();

    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerSearch) ||
        t.code.toLowerCase().includes(lowerSearch),
    );
  }

  /**
   * Gets the field definitions for a template.
   *
   * This is useful for:
   * - Validating that required fields can be mapped
   * - Displaying available fields to users
   * - Understanding what data is needed to populate a form
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param templateId - The FormsLive template ID
   * @returns Array of field definitions with display names and requirements
   */
  async getTemplateFields(
    userId: string,
    workspaceId: string,
    templateId: number,
  ): Promise<FormsLiveFormField[]> {
    const response = await this.clientService.get<{
      fields: Array<{
        display_name: string;
        name: string;
        required: boolean;
        type?: string;
      }>;
    }>(userId, workspaceId, `/templates/${templateId}`);

    return response.fields.map((f) => ({
      displayName: f.display_name,
      name: f.name,
      required: f.required,
      type: f.type,
    }));
  }

  /**
   * Gets a specific template by ID.
   *
   * @param userId - The user ID
   * @param workspaceId - The workspace ID
   * @param templateId - The FormsLive template ID
   * @returns The template if found, null otherwise
   */
  async getTemplate(
    userId: string,
    workspaceId: string,
    templateId: number,
  ): Promise<FormsLiveTemplate | null> {
    const templates = await this.listTemplates(userId, workspaceId);

    return templates.find((t) => t.id === templateId) ?? null;
  }
}
