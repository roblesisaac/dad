import AmptModel from '../utils/amptModel';

const ruleSchema = {
  userId: String,
  applyForTabs: [String],
  rule: [String],
  filterJoinOperator: (value) => String(value || '').toLowerCase() === 'or' ? 'or' : 'and',
  _isImportant: Boolean,
  orderOfExecution: Number,
  label1: 'userId'
};

export default AmptModel(['rules', 'userId'], ruleSchema);
