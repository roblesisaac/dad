import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { params } from '@ampt/sdk';

const { 
  PLAID_CLIENT_ID,
  PLAID_SECRET_PROD,
  PLAID_SECRET_SANDBOX,
  ENV_NAME 
} = params().list();

// Environment configuration
const ENV = ENV_NAME === 'prod' ? 'production' : 'sandbox';
const PLAID_SECRET = ENV === 'production' ? PLAID_SECRET_PROD : PLAID_SECRET_SANDBOX;
const IS_DEVELOPMENT = ENV !== 'production';

// Latest API version as of now - Update this as Plaid releases new versions
const PLAID_API_VERSION = '2020-09-14';

// Request timeout settings (important for serverless environments)
const TIMEOUT_MS = 30000; // 30 seconds

// Create configuration with improved settings
const config = new Configuration({
  basePath: PlaidEnvironments[ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
      'Plaid-Version': PLAID_API_VERSION,
    },
    // Add timeout for all requests
    timeout: TIMEOUT_MS,
  //   // Enable debug information in development
    validateStatus: status => {
      // Log failed requests in development
      if (IS_DEVELOPMENT && status >= 400) {
        console.warn(`Plaid API request failed with status: ${status}`);
      }
      // Return true to handle the error in the calling code
      return true;
    }
  },
});

// Create and export the Plaid API instance
export const plaidClientInstance = new PlaidApi(config);

// Helper to determine if an error is a Plaid rate limit error
export const isRateLimitError = (error) => {
  return error?.response?.data?.error_code === 'RATE_LIMIT_EXCEEDED';
};

// Helper to determine if an error is a Plaid API error
export const isPlaidError = (error) => {
  return Boolean(error?.response?.data?.error_code);
};

// Get Plaid API error details for better error handling
export const getPlaidErrorDetails = (error) => {
  if (!error?.response?.data) return null;
  
  const { error_code, error_message, display_message, request_id } = error.response.data;
  return {
    code: error_code,
    message: error_message,
    displayMessage: display_message,
    requestId: request_id
  };
};
