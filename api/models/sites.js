import Record from '../utils/records';
import { params } from '@ampt/sdk';
import pages from '../controllers/pages';

const siteSchema = Record('sites', {
  name: {
    type: String,
    unique: true,
    default: params('APP_NAME')
  },
  roles: [
    { 
      name: {
        value: String,
        default: 'public'
      },
      views: {
        value: [String],
        default: await pages.getPageNames()
      }
     }
  ],
  label1: 'name'
});

export default siteSchema;