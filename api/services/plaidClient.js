import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { params } from '@ampt/sdk';

const {
  PLAID_CLIENT_ID,
  PLAID_SECRET_PROD,
  PLAID_SECRET_SANDBOX,
  ENV_NAME
} = params().list();

function initPlaidClient() {
  const environment = ENV_NAME === 'prod' ? 'production' : 'sandbox';

  const config = new Configuration({
    basePath: PlaidEnvironments[environment],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
        'PLAID-SECRET': environment === 'production' ? PLAID_SECRET_PROD : PLAID_SECRET_SANDBOX,
        'Plaid-Version': '2020-09-14',
      },
    },
  });

  return new PlaidApi(config);
}

export const plaidClientInstance = initPlaidClient();
