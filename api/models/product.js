import AmptModel from '../utils/amptModel';

const productSchema = AmptModel('products', {
    name: { type: String, required: true },
    caption: String,
    description: String,
    price: Number,
    images: [
        { 
            name: String, 
            url: { type: String, required: true },
            isDefault: { type: Boolean, default: false }
        }
    ],
    brandId: { type: 'String', ref: 'brands' },
    categoryId: { type: 'String', ref: 'categories' }
});

export default productSchema;