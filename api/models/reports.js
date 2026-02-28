import AmptModel from '../utils/amptModel';

const rowSchema = {
  rowId: String,
  type: {
    type: String,
    enum: ['tab', 'manual']
  },
  tabId: String,
  groupId: String,
  dateStart: String,
  dateEnd: String,
  savedTotal: Number,
  title: String,
  amount: Number,
  sort: Number
};

const reportSchema = {
  userId: {
    set: (_, { req }) => req.user._id
  },
  name: String,
  rows: [rowSchema],
  createdAt: String,
  updatedAt: String,
  label1: 'userId',
  label2: 'name',
  label3: 'updatedAt'
};

export default AmptModel(['reports', 'userId'], reportSchema);
