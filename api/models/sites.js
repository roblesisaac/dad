import AmptModel from '../utils/amptModel';
import { params } from '@ampt/sdk';

const siteSchema = AmptModel('sites', {
  name: {
    default: params('APP_NAME'),
    type: String,
    unique: true
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
        type: String
      },
      views: [String]
     }
  ],
  label1: 'name'
});

export default siteSchema;