import AmptModel from '../utils/amptModel';

const brandSchema = AmptModel('brands', {
    name: { 
        type: String,
        required: true,
        unique: true
    }
});

export default brandSchema;