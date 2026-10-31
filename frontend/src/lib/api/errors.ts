/**
 * Normalized API Error Class
 */
export class ApiError extends Error {
  public status: number;
  public detail: string;
  public rawResponse?: unknown;

  constructor(status: number, detail: string, rawResponse?: unknown) {
    super(`API Error ${status}: ${detail}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.rawResponse = rawResponse;
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isServiceUnavailable(): boolean {
    return this.status === 503;
  }
}

/**
 * Format error for presentation to the user.
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Authentication required or session expired. Please sign in again.';
    }
    if (error.status === 409) {
      return 'User ID already exists. Please choose another username.';
    }
    if (error.status === 503) {
      return 'AgentForge service is initializing. Persistence store or agent not ready yet.';
    }
    return error.detail || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Check connection to AgentForge backend.';
}
