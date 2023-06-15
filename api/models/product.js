import Record from '../utils/recordJS';

const productSchema = Record('products', {
    name: { type: String, required: true },
    description: String,
    price: Number,
    image: String,
    brandId: { type: 'key', ref: 'brands' },
    categoryId: { type: 'key', ref: 'categories' }
});

export default productSchema;