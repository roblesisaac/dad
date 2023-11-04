import { parse } from 'vue/compiler-sfc';
import AmptModel from '../utils/amptModel';

const accountGroupSchema = {
  userId: {
    set: (_, { req }) => req.user._id
  },
  accounts: [
    {
      _id: String,
      account_id: String,
      mask: String,
      current: v => {
        const number = parseFloat(v);

        return isNaN(number) ? 0 : number;
      },
      available: v => {
        const number = parseFloat(v);

        return isNaN(number) ? 0 : number;
      }
    }
  ],
  totalCurrentBalance: (_, { item }) => {
    return item.accounts.reduce((acc, account) => 
      acc + account.current, 0
    );
  },
  totalAvailableBalance: (_, { item }) => {
    return item.accounts.reduce((acc, account) => 
      acc + account.available, 0
    );
  },
  isSelected: Boolean,
  name: String,
  label1: 'name'
};

export default AmptModel(['plaidgroups', 'userId'], accountGroupSchema);