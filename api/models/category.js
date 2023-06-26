import Record from '../utils/recordJS';

const categorySchema = Record('categories', {
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