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

  /**
   * Handles service errors consistently and updates sync status if needed
   * @param {Object} item - Item data
   * @param {Object} user - User data
   * @param {Error} error - Original error
   * @param {Object} context - Additional context about where the error occurred
   * @param {Function} updateProgress - Function to update sync progress
   * @throws {CustomError} Formatted error with sync status updated
   */
  static async handleServiceError(item, user, error, context = {}, updateProgress) {
    const { cursor, syncSession } = context;
    
    // Format the error appropriately
    const formattedError = CustomError.createFormattedError(error, context);

    // Update sync status if we have sync context and an update function
    if (item && user && cursor && updateProgress) {
      await updateProgress(item.itemId, user._id, {
        status: 'error',
        cursor: cursor,
        error: {
          code: formattedError.code,
          message: formattedError.message,
          timestamp: formattedError.timestamp,
          metadata: formattedError.metadata
        },
        stats: syncSession ? {
          added: syncSession.added?.length || 0,
          modified: syncSession.modified?.length || 0,
          removed: syncSession.removed?.length || 0
        } : undefined
      });
    }

    throw formattedError;
  }

  /**
   * Creates a properly formatted CustomError based on error type
   * @param {Error} error - Original error
   * @param {Object} context - Error context
   * @returns {CustomError} Formatted error
   */
  static createFormattedError(error, context = {}) {
    if (error instanceof CustomError) {
      return error;
    }

    // Handle Plaid API errors
    if (error.error_code || error.error_type) {
      return CustomError.fromPlaidError(error);
    }

    // Handle database errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return CustomError.database(
        context.operation || 'unknown',
        error.message,
        error
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return CustomError.validation(error.message, error.errors);
    }

    // Handle sync-specific errors
    if (context.syncSession || context.cursor) {
      return CustomError.sync(error.message, {
        cursor: context.cursor,
        batchCount: context.batchCount,
        ...context
      });
    }

    // Default error handling
    return new CustomError(
      'INTERNAL_ERROR',
      error.message || 'An unexpected error occurred',
      context
    );
  }
} 