import AmptModel from '../utils/amptModel';

const syncMetaSchema = {
  userId: String,
  resource: String,
  revision: Number,
  updatedAt: String,
  updatedByClientId: String
};

export default AmptModel('syncmeta', syncMetaSchema);
