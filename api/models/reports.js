import AmptModel from '../utils/amptModel';

const rowSchema = {
  rowId: String,
  type: {
    type: String,
    enum: ['tab', 'manual', 'report']
  },
  tabId: String,
  groupId: String,
  dateStart: String,
  dateEnd: String,
  drillPath: [String],
  drillPathLabels: [String],
  reportId: String,
  reportName: String,
  savedTotal: Number,
  title: String,
  amount: Number,
  amountFormula: String,
  amountDisplayType: String,
  sort: Number
};

const reportSchema = {
  userId: {
    set: (_, { req }) => req.user._id
  },
  name: String,
  folderName: String,
  totalFormula: String,
  totalDisplayType: String,
  rows: [rowSchema],
  sort: Number,
  createdAt: String,
  updatedAt: String,
  label1: 'userId',
  label2: 'name',
  label3: 'updatedAt'
};

export default AmptModel(['reports', 'userId'], reportSchema);
