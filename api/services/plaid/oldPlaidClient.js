import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { params } from '@ampt/sdk';

const { 
  PLAID_CLIENT_ID,
  PLAID_SECRET_PROD,
  PLAID_SECRET_SANDBOX,
  ENV_NAME 
} = params().list();

const ENV = ENV_NAME === 'prod' ? 'production' : 'sandbox';
const PLAID_SECRET = ENV === 'production' ? PLAID_SECRET_PROD : PLAID_SECRET_SANDBOX;

const config = new Configuration({
  basePath: PlaidEnvironments[ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

export const plaidClientInstance = new PlaidApi(config);
