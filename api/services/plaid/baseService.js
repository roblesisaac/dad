export default class PlaidBaseService {
  constructor(plaidClient) {
    this.client = plaidClient;
  }

  handlePlaidError(error) {
    if (error.error_code) {
      throw {
        error_code: error.error_code,
        error_message: error.error_message || 'Plaid API error'
      };
    }
    throw new Error(`PLAID_ERROR: ${error.message}`);
  }

  validateUser(user) {
    if (!user?._id || !user?.encryptionKey) {
      throw new Error('INVALID_USER: Missing required user data');
    }
    return true;
  }

  async handleResponse(promise) {
    try {
      const response = await promise;
      return response.data;
    } catch (error) {
      this.handlePlaidError(error);
    }
  }
} 