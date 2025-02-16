import AmptModel from '../utils/amptModel';

const tabSchema = {
  userId: {
    set: (_, { user }) => user._Id
  },
  tabName: String,
  showForGroup: [String],
  isSelected: Boolean,
  sort: Number,
  // sort: [{ group: String, sort: Number }],
  heading: {
    type: 'String',
    default: 'sum',
    enum: ['sum', 'average', 'min', 'max', 'count']
  },
  label1: 'userId'
};

export default AmptModel(['tabs', 'userId'], tabSchema);