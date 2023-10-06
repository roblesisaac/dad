import AmptModel from '../utils/amptModel';

const categorySchema = AmptModel('categories', {
    name: { 
        type: String, 
        required: true, 
        unique: true
    },
    image: String,
    caption: String,
    description: String,
});

export default categorySchema;