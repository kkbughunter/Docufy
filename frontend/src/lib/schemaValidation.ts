import type { JsonValue } from '../types'

export function parseSchema(
  schemaText: string,
): { ok: true; value: JsonValue } | { ok: false; error: string } {
  try {
    const value = JSON.parse(schemaText) as JsonValue

    if (value === null || Array.isArray(value) || typeof value !== 'object') {
      return { ok: false, error: 'Schema must be a JSON object.' }
    }

    return { ok: true, value }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON schema.',
    }
  }
}
