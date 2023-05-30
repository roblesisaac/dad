import Record from '../utils/recordJS';

const brandSchema = Record('brands', {
    name: { type: String, required: true, unique: true }
});

export default brandSchema;