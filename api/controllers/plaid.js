import { params } from '@ampt/sdk';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const {
  AMPT_URL,
  PLAID_CLIENT_ID,
  PLAID_SECRET_SANDBOX
} = params().list();

const app = function() {
  function buildConfiguration() {
    return new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': PLAID_SECRET_SANDBOX,
          'Plaid-Version': '2020-09-14',
        },
      },
    });
  }

  function buildRequest({ client_user_id, redirect_uri }) {
    return {
      user: { client_user_id },
      client_name: 'Plaid Test App',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en',
      redirect_uri: redirect_uri || `${AMPT_URL}/spendingreport`
    };
  }

  return {
    getLinkToken: async (req, res) => {
      const { redirect_uri, user: { _id } } = req;

      const plaidClient = new PlaidApi(buildConfiguration());
      const request = buildRequest({ client_user_id: _id, redirect_uri });
      const response = await plaidClient.linkTokenCreate(request);
      const { link_token } = response.data;

      res.json(link_token);
    }
  }
}();

export default app;