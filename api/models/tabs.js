import AmptModel from '../utils/amptModel';

const tabSchema = {
  userId: {
    set: (_, { req }) => req.user._id
  },
  tabName: String,
  showForGroup: [String],
  isSelected: Boolean,
  order: Number
};

export default AmptModel(['tabs', 'userId'], tabSchema);