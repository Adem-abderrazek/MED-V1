/**
 * Centralized error handling utilities
 * Extracts error messages from API errors in a consistent way
 */

export interface ApiError {
  message?: string;
  errors?: Array<string | { msg?: string; message?: string; field?: string }>;
  response?: {
    data?: {
      message?: string;
      error?: string;
      errors?: Array<string | { msg?: string; message?: string }>;
    };
    status?: number;
  };
  status?: number;
}

/**
 * Extracts a user-friendly error message from an API error
 * @param error - The error object from API call
 * @param fallback - Fallback message if no error message can be extracted
 * @returns A user-friendly error message string
 */
export function extractErrorMessage(error: any, fallback: string): string {
  // If error is already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Try to get message from error object
  let errorMessage = error?.message || error?.error;

  // Skip generic validation messages
  if (errorMessage === 'Validation failed') {
    errorMessage = undefined;
  }

  // Try to get message from response data
  if (!errorMessage && error?.response?.data) {
    errorMessage = error.response.data.message || error.response.data.error;
  }

  // Extract validation errors if available
  const validationErrors = error?.errors || error?.response?.data?.errors || [];
  
  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    const errorDetails = validationErrors
      .map((err: any) => {
        // Handle express-validator format: { msg, path, location, type, value }
        if (err?.msg) return err.msg;
        // Handle string errors
        if (typeof err === 'string') return err;
        // Handle error objects with message
        if (err?.message) return err.message;
        // Handle field-specific errors
        if (err?.field && err?.message) return `${err.field}: ${err.message}`;
        return null;
      })
      .filter(Boolean);

    if (errorDetails.length > 0) {
      // Use first validation error as primary message
      return errorDetails[0] as string;
    }
  }

  // Return extracted message or fallback
  return errorMessage || fallback;
}

/**
 * Extracts all error messages from an API error
 * Useful for displaying multiple validation errors
 * @param error - The error object from API call
 * @returns Array of error message strings
 */
export function extractAllErrorMessages(error: any): string[] {
  const messages: string[] = [];

  // Add main error message
  if (error?.message && error.message !== 'Validation failed') {
    messages.push(error.message);
  }

  if (error?.response?.data?.message) {
    messages.push(error.response.data.message);
  }

  // Add validation errors
  const validationErrors = error?.errors || error?.response?.data?.errors || [];
  
  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    const errorDetails = validationErrors
      .map((err: any) => {
        if (err?.msg) return err.msg;
        if (typeof err === 'string') return err;
        if (err?.message) return err.message;
        return null;
      })
      .filter(Boolean) as string[];

    messages.push(...errorDetails);
  }

  // Remove duplicates
  return [...new Set(messages)];
}

/**
 * Checks if error is a network error
 * @param error - The error object
 * @returns true if it's a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.message?.includes('network') ||
    error?.message?.includes('Network') ||
    error?.code === 'NETWORK_ERROR' ||
    error?.response === undefined
  );
}

/**
 * Checks if error is a server error (5xx)
 * @param error - The error object
 * @returns true if it's a server error
 */
export function isServerError(error: any): boolean {
  const status = error?.status || error?.response?.status;
  return status >= 500 && status < 600;
}

