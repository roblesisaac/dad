import Record from '../utils/records';
import { params } from '@ampt/sdk';

const siteSchema = Record('sites', {
  name: {
    type: String,
    unique: true,
    default: params('APP_NAME')
  },
  email: String,
  readableNames: [
    {
      name: String,
      path: String
    }
  ],
  roles: [
    { 
      name: {
        value: String
      },
      views: {
        value: [String]
      }
     }
  ],
  label1: 'name'
});

export default siteSchema;