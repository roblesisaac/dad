import AmptModel from '../utils/amptModel';

const ruleSchema = {
  userId: {
    set: (_, { req }) => req.user._id
  },
  applyForGroups: [String],
  applyForTabs: [String],
  rule: ['String']
};

export default AmptModel(['rules', 'userId'], ruleSchema);