import Record from '../utils/recordJS';

const categorySchema = Record('categories', {
    name: { type: String, required: true, unique: true },
    image: { type: String },
    description: { type: String },
});

export default categorySchema;