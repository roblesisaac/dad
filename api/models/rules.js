import AmptModel from '../utils/amptModel';

const ruleSchema = {
  userId: {
    set: (_, { user }) => user._Id
  },
  applyForTabs: [String],
  rule: [String],
  _isImportant: Boolean,
  orderOfExecution: Number,
  // orderOfExecution: [{ tabId: Number }],
  label1: 'userId'
};

export default AmptModel(['rules', 'userId'], ruleSchema);