/**
 * Custom error class for Plaid service errors
 * Allows for consistent error formatting and handling across the application
 */
export class CustomError extends Error {
  /**
   * Creates a new CustomError instance
   * @param {string} code - Error code (e.g., 'INVALID_TOKEN', 'SYNC_ERROR')
   * @param {string} message - Detailed error message
   * @param {Object} [metadata] - Optional additional error data
   */
  constructor(code, message, metadata = {}) {
    // Create the full error message with code
    const fullMessage = `${code}: ${message}`;
    super(fullMessage);

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CustomError);
    }

    // Custom properties
    this.name = 'CustomError';
    this.code = code;
    this.originalMessage = message;
    this.timestamp = new Date().toISOString();
    this.metadata = metadata;

    // For Plaid-specific error codes
    if (metadata.plaidError) {
      this.plaidErrorCode = metadata.plaidError.error_code;
      this.plaidErrorType = metadata.plaidError.error_type;
    }
  }

  /**
   * Creates a formatted error object for API responses
   * @returns {Object} Formatted error object
   */
  toJSON() {
    return {
      error: this.code,
      message: this.originalMessage,
      timestamp: this.timestamp,
      ...(Object.keys(this.metadata).length > 0 && { metadata: this.metadata })
    };
  }

  /**
   * Helper method to create a Plaid-specific error
   * @param {Object} plaidError - Error from Plaid API
   * @returns {CustomError} New CustomError instance
   */
  static fromPlaidError(plaidError) {
    const code = plaidError.error_code || 'PLAID_ERROR';
    const message = plaidError.error_message || 'An error occurred with the Plaid service';
    
    return new CustomError(code, message, {
      plaidError,
      source: 'Plaid API'
    });
  }

  /**
   * Helper method to create a validation error
   * @param {string} message - Validation error message
   * @param {Object} [details] - Validation details
   * @returns {CustomError} New CustomError instance
   */
  static validation(message, details = {}) {
    return new CustomError('VALIDATION_ERROR', message, {
      validation: details
    });
  }

  /**
   * Helper method to create a database error
   * @param {string} operation - Database operation that failed
   * @param {string} message - Error message
   * @param {Error} [originalError] - Original database error
   * @returns {CustomError} New CustomError instance
   */
  static database(operation, message, originalError = null) {
    return new CustomError('DATABASE_ERROR', message, {
      operation,
      originalError: originalError?.message
    });
  }

  /**
   * Helper method to create an authentication error
   * @param {string} message - Auth error message
   * @returns {CustomError} New CustomError instance
   */
  static authentication(message) {
    return new CustomError('AUTH_ERROR', message);
  }

  /**
   * Helper method to create a sync error
   * @param {string} message - Sync error message
   * @param {Object} [details] - Additional sync error details
   * @returns {CustomError} New CustomError instance
   */
  static sync(message, details = {}) {
    return new CustomError('SYNC_ERROR', message, {
      sync: details
    });
  }
} 