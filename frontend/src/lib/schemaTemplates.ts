import type { JsonValue } from '../types'

export const schemaTemplates = {
  Resume: {
    candidate_name: 'string',
    email: 'string',
    phone: 'string',
    location: 'string',
    skills: ['string'],
    work_experience: [
      {
        company: 'string',
        role: 'string',
        start_date: 'date',
        end_date: 'date',
        highlights: ['string'],
      },
    ],
    education: [
      {
        institution: 'string',
        degree: 'string',
        year: 'number',
      },
    ],
  },
  Invoice: {
    invoice_number: 'string',
    invoice_date: 'date',
    due_date: 'date',
    vendor_name: 'string',
    customer_name: 'string',
    line_items: [
      {
        description: 'string',
        quantity: 'number',
        unit_price: 'number',
        total: 'number',
      },
    ],
    subtotal: 'number',
    tax: 'number',
    total_amount: 'number',
    currency: 'string',
  },
  'ID Card': {
    document_number: 'string',
    full_name: 'string',
    date_of_birth: 'date',
    gender: 'string',
    address: 'string',
    issue_date: 'date',
    expiry_date: 'date',
  },
  Receipt: {
    merchant_name: 'string',
    receipt_date: 'date',
    receipt_number: 'string',
    items: [
      {
        name: 'string',
        quantity: 'number',
        price: 'number',
      },
    ],
    tax: 'number',
    total: 'number',
    payment_method: 'string',
  },
  Contract: {
    contract_title: 'string',
    contract_number: 'string',
    effective_date: 'date',
    expiry_date: 'date',
    parties: ['string'],
    key_terms: ['string'],
    payment_terms: 'string',
    termination_clause: 'string',
  },
  'Medical Report': {
    patient_name: 'string',
    patient_id: 'string',
    report_date: 'date',
    provider_name: 'string',
    diagnosis: ['string'],
    medications: ['string'],
    recommendations: ['string'],
  },
  'Bank Statement': {
    account_holder: 'string',
    account_number_last4: 'string',
    bank_name: 'string',
    statement_period_start: 'date',
    statement_period_end: 'date',
    opening_balance: 'number',
    closing_balance: 'number',
    transactions: [
      {
        date: 'date',
        description: 'string',
        debit: 'number',
        credit: 'number',
        balance: 'number',
      },
    ],
  },
  Custom: {
    field_name: 'string',
    another_field: 'number',
    nested_items: [
      {
        label: 'string',
        value: 'string',
      },
    ],
  },
} satisfies Record<string, JsonValue>

export const defaultSchemaText = JSON.stringify(schemaTemplates.Resume, null, 2)

export function schemaTemplateForDocumentType(documentType: string): JsonValue {
  if (documentType in schemaTemplates) {
    return schemaTemplates[documentType as keyof typeof schemaTemplates]
  }
  return schemaTemplates.Custom
}
