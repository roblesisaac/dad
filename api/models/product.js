import Record from '../utils/recordJS';

const productSchema = Record('products', {
    name: { type: String, required: true },
    description: String,
    price: Number,
    image: String,
    brandId: { type: String, ref: 'brands' },
    categoryId: { type: String, ref: 'categories' }
});

export default productSchema;