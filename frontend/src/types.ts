export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type DocumentType =
  | 'Resume'
  | 'Invoice'
  | 'Receipt'
  | 'Contract'
  | 'ID Card'
  | 'Medical Report'
  | 'Bank Statement'
  | 'Custom'

export type LanguageHint = 'English' | 'Tamil' | 'Hindi' | 'Mixed' | 'Other'

export type UserProfile = {
  email: string
  fullName?: string
  avatarUrl?: string
}

export type PlanLimits = {
  max_groups?: number | null
  max_requests?: number | null
  max_file_size_mb?: number | null
}

export type BillingPlan = {
  key: string
  name: string
  description: string
  price_usd?: number | null
  interval_label?: string | null
  cta_label: string
  cta_href?: string | null
  highlighted?: boolean
  contact_only?: boolean
  internal?: boolean
  features: string[]
  limits: PlanLimits
}

export type BillingSummary = {
  plan_key: string
  billing_status: string
  dodo_customer_id?: string | null
  dodo_subscription_id?: string | null
  billing_period_start?: string | null
  billing_period_end?: string | null
  last_successful_purchase_at?: string | null
  last_failed_purchase_at?: string | null
  current_plan: BillingPlan
  public_plans: BillingPlan[]
  recent_events: BillingEvent[]
}

export type BillingEvent = {
  event_type: string
  status: string
  plan_key?: string | null
  plan_name?: string | null
  product_id?: string | null
  payment_id?: string | null
  subscription_id?: string | null
  failure_reason?: string | null
  created_at: string
}

export type UsageWindow = {
  started_at: string
  ends_at?: string | null
}

export type UsageTotals = {
  total_calls: number
  requests_used: number
  success_calls: number
  failed_calls: number
  blocked_calls: number
  average_duration_ms: number
}

export type UsageSummary = {
  plan_key: string
  billing_status: string
  groups_used: number
  groups_remaining?: number | null
  requests_remaining?: number | null
  limits: PlanLimits
  window: UsageWindow
  totals: UsageTotals
}

export type UsageHistoryItem = {
  id: string
  group_id?: string | null
  group_name?: string | null
  endpoint_path: string
  http_method: string
  auth_mode: string
  request_status: string
  status_code: number
  duration_ms: number
  ai_model?: string | null
  used_ai_call: boolean
  file_name?: string | null
  file_size_bytes?: number | null
  error_message?: string | null
  created_at: string
}

export type AuthResponse = {
  access_token: string
  refresh_token: string
}

export type ApiGroup = {
  id: string
  name: string
  description?: string | null
  document_type: DocumentType | string
  document_hint?: string | null
  language_hint: LanguageHint | string
  output_schema: JsonValue
  api_key?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export type GroupPayload = {
  name: string
  description?: string
  document_type: DocumentType
  document_hint?: string
  language_hint: LanguageHint
  output_schema: JsonValue
}

export type ExtractResponse =
  | {
      success: true
      data: JsonValue
    }
  | {
      success: false
      error: string
    }
