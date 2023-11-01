import AmptModel from '../utils/amptModel';

const tabSchema = {
  userId: {
    set: (_, { user }) => user._id
  },
  tabName: String,
  showForGroup: [String],
  isSelected: Boolean,
  sort: Number,
  label1: 'userId'
};

export default AmptModel(['tabs', 'userId'], tabSchema);