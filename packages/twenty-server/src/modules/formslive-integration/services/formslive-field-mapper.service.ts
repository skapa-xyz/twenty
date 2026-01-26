import { Injectable } from '@nestjs/common';

import { AustralianState } from 'src/modules/formslive-integration/entities/formslive-connection.entity';
import {
  BuyerData,
  AgentData,
} from 'src/modules/formslive-integration/types/formslive.types';

/**
 * Field mapping configuration for Buyer to FormsLive form fields.
 * Each Australian state may have different field names in their forms.
 */
type BuyerFieldMapping = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  engagementFee: string;
  commissionRate: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  solicitorName: string;
  solicitorContact: string;
  mortgageBrokerName: string;
  mortgageBrokerContact: string;
  engagementDate: string;
};

/**
 * State-specific field name mappings.
 *
 * FormsLive forms use different field names depending on the state's
 * legal requirements and form templates. These mappings are based on
 * analyzing actual FormsLive templates for each state.
 *
 * Note: VIC, SA, WA, TAS, NT, ACT mappings should be populated based
 * on actual field lists from FormsLive once templates are obtained.
 */
const FIELD_MAPPINGS: Record<AustralianState, BuyerFieldMapping> = {
  QLD: {
    buyerName: 'purchaser_name',
    buyerEmail: 'purchaser_email',
    buyerPhone: 'purchaser_phone',
    engagementFee: 'engagement_fee',
    commissionRate: 'commission_percentage',
    agentName: 'agent_name',
    agentEmail: 'agent_email',
    agentPhone: 'agent_phone',
    solicitorName: 'solicitor_name',
    solicitorContact: 'solicitor_contact',
    mortgageBrokerName: 'broker_name',
    mortgageBrokerContact: 'broker_contact',
    engagementDate: 'engagement_date',
  },
  NSW: {
    buyerName: 'buyer_name_1',
    buyerEmail: 'buyer_email_1',
    buyerPhone: 'buyer_phone_1',
    engagementFee: 'fee_amount',
    commissionRate: 'commission_rate',
    agentName: 'agent_full_name',
    agentEmail: 'agent_email_address',
    agentPhone: 'agent_mobile',
    solicitorName: 'conveyancer_name',
    solicitorContact: 'conveyancer_contact',
    mortgageBrokerName: 'finance_broker_name',
    mortgageBrokerContact: 'finance_broker_contact',
    engagementDate: 'agreement_date',
  },
  // Placeholder mappings - to be updated with actual field names
  VIC: {
    buyerName: 'buyer_name',
    buyerEmail: 'buyer_email',
    buyerPhone: 'buyer_phone',
    engagementFee: 'engagement_fee',
    commissionRate: 'commission_rate',
    agentName: 'agent_name',
    agentEmail: 'agent_email',
    agentPhone: 'agent_phone',
    solicitorName: 'solicitor_name',
    solicitorContact: 'solicitor_contact',
    mortgageBrokerName: 'broker_name',
    mortgageBrokerContact: 'broker_contact',
    engagementDate: 'engagement_date',
  },
  SA: {
    buyerName: 'buyer_name',
    buyerEmail: 'buyer_email',
    buyerPhone: 'buyer_phone',
    engagementFee: 'engagement_fee',
    commissionRate: 'commission_rate',
    agentName: 'agent_name',
    agentEmail: 'agent_email',
    agentPhone: 'agent_phone',
    solicitorName: 'solicitor_name',
    solicitorContact: 'solicitor_contact',
    mortgageBrokerName: 'broker_name',
    mortgageBrokerContact: 'broker_contact',
    engagementDate: 'engagement_date',
  },
  WA: {
    buyerName: 'buyer_name',
    buyerEmail: 'buyer_email',
    buyerPhone: 'buyer_phone',
    engagementFee: 'engagement_fee',
    commissionRate: 'commission_rate',
    agentName: 'agent_name',
    agentEmail: 'agent_email',
    agentPhone: 'agent_phone',
    solicitorName: 'solicitor_name',
    solicitorContact: 'solicitor_contact',
    mortgageBrokerName: 'broker_name',
    mortgageBrokerContact: 'broker_contact',
    engagementDate: 'engagement_date',
  },
  TAS: {
    buyerName: 'buyer_name',
    buyerEmail: 'buyer_email',
    buyerPhone: 'buyer_phone',
    engagementFee: 'engagement_fee',
    commissionRate: 'commission_rate',
    agentName: 'agent_name',
    agentEmail: 'agent_email',
    agentPhone: 'agent_phone',
    solicitorName: 'solicitor_name',
    solicitorContact: 'solicitor_contact',
    mortgageBrokerName: 'broker_name',
    mortgageBrokerContact: 'broker_contact',
    engagementDate: 'engagement_date',
  },
  NT: {
    buyerName: 'buyer_name',
    buyerEmail: 'buyer_email',
    buyerPhone: 'buyer_phone',
    engagementFee: 'engagement_fee',
    commissionRate: 'commission_rate',
    agentName: 'agent_name',
    agentEmail: 'agent_email',
    agentPhone: 'agent_phone',
    solicitorName: 'solicitor_name',
    solicitorContact: 'solicitor_contact',
    mortgageBrokerName: 'broker_name',
    mortgageBrokerContact: 'broker_contact',
    engagementDate: 'engagement_date',
  },
  ACT: {
    buyerName: 'buyer_name',
    buyerEmail: 'buyer_email',
    buyerPhone: 'buyer_phone',
    engagementFee: 'engagement_fee',
    commissionRate: 'commission_rate',
    agentName: 'agent_name',
    agentEmail: 'agent_email',
    agentPhone: 'agent_phone',
    solicitorName: 'solicitor_name',
    solicitorContact: 'solicitor_contact',
    mortgageBrokerName: 'broker_name',
    mortgageBrokerContact: 'broker_contact',
    engagementDate: 'engagement_date',
  },
};

/**
 * Service for mapping Buyer object data to FormsLive form fields.
 *
 * FormsLive forms have specific field names that vary by state. This service
 * provides the translation layer between our Buyer object fields and the
 * FormsLive form field names.
 *
 * @example
 * ```typescript
 * const fieldValues = fieldMapperService.mapBuyerToFormFields(
 *   { name: 'John Smith', email: 'john@example.com', engagementFee: 2500 },
 *   { displayName: 'Agent Name', email: 'agent@agency.com' },
 *   'QLD'
 * );
 * // Returns: { purchaser_name: 'John Smith', purchaser_email: 'john@example.com', ... }
 * ```
 */
@Injectable()
export class FormsLiveFieldMapperService {
  /**
   * Maps Buyer and Agent data to FormsLive form field values.
   *
   * @param buyer - Buyer data from the CRM
   * @param agent - Agent data (the Buyers Agent user)
   * @param state - Australian state for field name lookup
   * @returns Map of field names to values for FormsLive form
   */
  mapBuyerToFormFields(
    buyer: BuyerData,
    agent: AgentData,
    state: AustralianState,
  ): Record<string, string> {
    const mapping = FIELD_MAPPINGS[state];

    const fields: Record<string, string> = {};

    // Buyer fields
    fields[mapping.buyerName] = buyer.name;

    if (buyer.email) {
      fields[mapping.buyerEmail] = buyer.email;
    }

    if (buyer.phone) {
      fields[mapping.buyerPhone] = buyer.phone;
    }

    // Fee fields
    if (buyer.engagementFee !== undefined) {
      fields[mapping.engagementFee] = String(buyer.engagementFee);
    }

    if (buyer.commissionRate !== undefined) {
      fields[mapping.commissionRate] = String(buyer.commissionRate);
    } else {
      // Default commission rate of 2%
      fields[mapping.commissionRate] = '2';
    }

    // Agent fields
    fields[mapping.agentName] = agent.displayName;

    if (agent.email) {
      fields[mapping.agentEmail] = agent.email;
    }

    if (agent.phone) {
      fields[mapping.agentPhone] = agent.phone;
    }

    // Professional contacts
    if (buyer.solicitorName) {
      fields[mapping.solicitorName] = buyer.solicitorName;
    }

    if (buyer.solicitorContact) {
      fields[mapping.solicitorContact] = buyer.solicitorContact;
    }

    if (buyer.mortgageBrokerName) {
      fields[mapping.mortgageBrokerName] = buyer.mortgageBrokerName;
    }

    if (buyer.mortgageBrokerContact) {
      fields[mapping.mortgageBrokerContact] = buyer.mortgageBrokerContact;
    }

    // Engagement date (today)
    fields[mapping.engagementDate] = new Date().toISOString().split('T')[0];

    return fields;
  }

  /**
   * Generates signer configuration for remote signing.
   *
   * FormsLive remote signing requires specifying who needs to sign and in what role.
   * Typically for engagement agreements:
   * - 'Principal' = The Buyer (client)
   * - 'Agent' = The Buyers Agent
   *
   * @param buyer - Buyer data including email for signing
   * @param agent - Agent data including email for signing
   * @returns Array of signer configurations for FormsLive
   */
  getSignerConfiguration(
    buyer: BuyerData,
    agent: AgentData,
  ): Array<{ signer: string; name: string; email: string }> {
    const signers: Array<{ signer: string; name: string; email: string }> = [];

    // Buyer signs as Principal
    if (buyer.email) {
      signers.push({
        signer: 'Principal',
        name: buyer.name,
        email: buyer.email,
      });
    }

    // Agent signs as Agent
    if (agent.email) {
      signers.push({
        signer: 'Agent',
        name: agent.displayName,
        email: agent.email,
      });
    }

    return signers;
  }

  /**
   * Get the field mapping for a specific state.
   * Useful for debugging or displaying available fields.
   *
   * @param state - Australian state
   * @returns The field mapping configuration
   */
  getFieldMapping(state: AustralianState): BuyerFieldMapping {
    return FIELD_MAPPINGS[state];
  }
}
