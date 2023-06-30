import Record from '../utils/records';

const brandSchema = Record('brands', {
    name: { 
        type: String,
        required: true,
        unique: true
    }
});

export default brandSchema;