import { FormNumberFieldInput } from '@/object-record/record-field/ui/form-types/components/FormNumberFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { Select } from '@/ui/input/components/Select';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { type WorkflowXeroCreateInvoiceAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { t } from '@lingui/core/macro';
import { HorizontalSeparator } from 'twenty-ui/display';
import { type SelectOption } from 'twenty-ui/input';

type WorkflowEditActionXeroCreateInvoiceProps = {
  action: WorkflowXeroCreateInvoiceAction;
  actionOptions:
    | {
        readonly: true;
      }
    | {
        readonly?: false;
        onActionUpdate: (action: WorkflowXeroCreateInvoiceAction) => void;
      };
};

export const WorkflowEditActionXeroCreateInvoice = ({
  action,
  actionOptions,
}: WorkflowEditActionXeroCreateInvoiceProps) => {
  const invoiceTypeOptions: Array<
    SelectOption<'ACCREC' | 'ACCPAY'>
  > = [
    { label: t`Sales Invoice (Accounts Receivable)`, value: 'ACCREC' },
    { label: t`Bill (Accounts Payable)`, value: 'ACCPAY' },
  ];

  const invoiceStatusOptions: Array<
    SelectOption<'DRAFT' | 'SUBMITTED' | 'AUTHORISED'>
  > = [
    { label: t`Draft`, value: 'DRAFT' },
    { label: t`Submitted`, value: 'SUBMITTED' },
    { label: t`Authorised`, value: 'AUTHORISED' },
  ];

  const lineAmountTypeOptions: Array<
    SelectOption<'Exclusive' | 'Inclusive' | 'NoTax'>
  > = [
    { label: t`Tax Exclusive`, value: 'Exclusive' },
    { label: t`Tax Inclusive`, value: 'Inclusive' },
    { label: t`No Tax`, value: 'NoTax' },
  ];

  const handleContactChange = (
    field: keyof WorkflowXeroCreateInvoiceAction['settings']['input']['contact'],
    value: string,
  ) => {
    if (actionOptions.readonly === true) {
      return;
    }

    actionOptions.onActionUpdate({
      ...action,
      settings: {
        ...action.settings,
        input: {
          ...action.settings.input,
          contact: {
            ...action.settings.input.contact,
            [field]: value,
          },
        },
      },
    });
  };

  const handleLineItemChange = (
    index: number,
    field: string,
    value: string | number | null,
  ) => {
    if (actionOptions.readonly === true) {
      return;
    }

    const updatedLineItems = [...action.settings.input.lineItems];

    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: value ?? '',
    };

    actionOptions.onActionUpdate({
      ...action,
      settings: {
        ...action.settings,
        input: {
          ...action.settings.input,
          lineItems: updatedLineItems,
        },
      },
    });
  };

  const handleAddLineItem = () => {
    if (actionOptions.readonly === true) {
      return;
    }

    actionOptions.onActionUpdate({
      ...action,
      settings: {
        ...action.settings,
        input: {
          ...action.settings.input,
          lineItems: [
            ...action.settings.input.lineItems,
            { description: '', quantity: 1, unitAmount: 0 },
          ],
        },
      },
    });
  };

  const handleRemoveLineItem = (index: number) => {
    if (actionOptions.readonly === true) {
      return;
    }

    if (action.settings.input.lineItems.length <= 1) {
      return;
    }

    const updatedLineItems = action.settings.input.lineItems.filter(
      (_, i) => i !== index,
    );

    actionOptions.onActionUpdate({
      ...action,
      settings: {
        ...action.settings,
        input: {
          ...action.settings.input,
          lineItems: updatedLineItems,
        },
      },
    });
  };

  const handleSettingChange = (
    field: keyof WorkflowXeroCreateInvoiceAction['settings']['input'],
    value: string,
  ) => {
    if (actionOptions.readonly === true) {
      return;
    }

    actionOptions.onActionUpdate({
      ...action,
      settings: {
        ...action.settings,
        input: {
          ...action.settings.input,
          [field]: value,
        },
      },
    });
  };

  return (
    <>
      <WorkflowStepBody>
        <FormTextFieldInput
          label={t`Contact Name`}
          defaultValue={action.settings.input.contact.name ?? ''}
          onChange={(value) => handleContactChange('name', value)}
          readonly={actionOptions.readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`Enter contact name`}
        />
        <FormTextFieldInput
          label={t`Contact Email`}
          defaultValue={action.settings.input.contact.emailAddress ?? ''}
          onChange={(value) => handleContactChange('emailAddress', value)}
          readonly={actionOptions.readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`Enter contact email`}
        />

        <HorizontalSeparator noMargin />

        {action.settings.input.lineItems.map((lineItem, index) => (
          <div key={index}>
            <FormTextFieldInput
              label={t`Line Item ${index + 1} - Description`}
              defaultValue={lineItem.description}
              onChange={(value) =>
                handleLineItemChange(index, 'description', value)
              }
              readonly={actionOptions.readonly}
              VariablePicker={WorkflowVariablePicker}
              placeholder={t`Enter description`}
            />
            <FormNumberFieldInput
              label={t`Quantity`}
              defaultValue={lineItem.quantity}
              onChange={(value) =>
                handleLineItemChange(index, 'quantity', value)
              }
              readonly={actionOptions.readonly}
              VariablePicker={WorkflowVariablePicker}
              placeholder={t`1`}
            />
            <FormNumberFieldInput
              label={t`Unit Amount`}
              defaultValue={lineItem.unitAmount}
              onChange={(value) =>
                handleLineItemChange(index, 'unitAmount', value)
              }
              readonly={actionOptions.readonly}
              VariablePicker={WorkflowVariablePicker}
              placeholder={t`0.00`}
            />
            <FormTextFieldInput
              label={t`Account Code`}
              defaultValue={lineItem.accountCode ?? ''}
              onChange={(value) =>
                handleLineItemChange(index, 'accountCode', value)
              }
              readonly={actionOptions.readonly}
              VariablePicker={WorkflowVariablePicker}
              placeholder={t`e.g. 200`}
            />
            {action.settings.input.lineItems.length > 1 &&
              actionOptions.readonly !== true && (
                <button
                  onClick={() => handleRemoveLineItem(index)}
                  type="button"
                >
                  {t`Remove Line Item`}
                </button>
              )}
            {index < action.settings.input.lineItems.length - 1 && (
              <HorizontalSeparator noMargin />
            )}
          </div>
        ))}

        {actionOptions.readonly !== true && (
          <button onClick={handleAddLineItem} type="button">
            {t`Add Line Item`}
          </button>
        )}

        <HorizontalSeparator noMargin />

        <Select
          dropdownId="workflow-xero-invoice-type"
          label={t`Invoice Type`}
          options={invoiceTypeOptions}
          dropdownWidth={GenericDropdownContentWidth.Large}
          value={action.settings.input.type ?? 'ACCREC'}
          onChange={(value) => handleSettingChange('type', value)}
          disabled={actionOptions.readonly}
        />
        <Select
          dropdownId="workflow-xero-invoice-status"
          label={t`Invoice Status`}
          options={invoiceStatusOptions}
          dropdownWidth={GenericDropdownContentWidth.Large}
          value={action.settings.input.status ?? 'DRAFT'}
          onChange={(value) => handleSettingChange('status', value)}
          disabled={actionOptions.readonly}
        />
        <Select
          dropdownId="workflow-xero-line-amount-types"
          label={t`Tax Treatment`}
          options={lineAmountTypeOptions}
          dropdownWidth={GenericDropdownContentWidth.Large}
          value={action.settings.input.lineAmountTypes ?? 'Exclusive'}
          onChange={(value) => handleSettingChange('lineAmountTypes', value)}
          disabled={actionOptions.readonly}
        />

        <HorizontalSeparator noMargin />

        <FormTextFieldInput
          label={t`Reference`}
          defaultValue={action.settings.input.reference ?? ''}
          onChange={(value) => handleSettingChange('reference', value)}
          readonly={actionOptions.readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`e.g. PO-12345`}
        />
        <FormTextFieldInput
          label={t`Date`}
          defaultValue={action.settings.input.date ?? ''}
          onChange={(value) => handleSettingChange('date', value)}
          readonly={actionOptions.readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`YYYY-MM-DD`}
        />
        <FormTextFieldInput
          label={t`Due Date`}
          defaultValue={action.settings.input.dueDate ?? ''}
          onChange={(value) => handleSettingChange('dueDate', value)}
          readonly={actionOptions.readonly}
          VariablePicker={WorkflowVariablePicker}
          placeholder={t`YYYY-MM-DD`}
        />
      </WorkflowStepBody>

      <WorkflowStepFooter stepId={action.id} />
    </>
  );
};
