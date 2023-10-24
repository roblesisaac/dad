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
      current: parseFloat
    }
  ],
  totalBalance: (_, { item }) => {
    return item.accounts.reduce((acc, account) => 
      acc + account.current, 0
    );
  },
  isSelected: Boolean,
  name: String,
  label1: 'name'
};

export default AmptModel(['plaidgroups', 'userId'], accountGroupSchema);