import AmptModel from '../utils/amptModel';

const schema = {
  category_id: String,
  defaultName: String,
  customName: String
};

export default AmptModel('custom_category_names', schema);