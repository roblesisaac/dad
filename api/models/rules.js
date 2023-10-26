import AmptModel from '../utils/amptModel';

const ruleSchema = {
  userId: {
    set: (_, { user }) => user._id
  },
  applyForGroups: [String],
  applyForTabs: [String],
  rule: [String],
  _isImportant: Boolean,
  orderOfExecution: Number,
  label1: 'userId'
};

export default AmptModel(['rules', 'userId'], ruleSchema);