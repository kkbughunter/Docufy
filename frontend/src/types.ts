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
