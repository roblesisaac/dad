import AmptModel from '../utils/amptModel';

const ruleSchema = {
  userId: String,
  applyForTabs: [String],
  rule: [String],
  _isImportant: Boolean,
  orderOfExecution: Number,
  label1: 'userId'
};

export default AmptModel(['rules', 'userId'], ruleSchema);