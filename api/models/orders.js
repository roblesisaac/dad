import AmptModel from '../utils/amptModel';
import { data } from '@ampt/data';

const orderSchema = AmptModel('orders', {
    userid: (_, { req }) => req.user.metadata.legacyId,
    orderItems: [
        {
            qty: { type: Number, required: true },
            productId: { type: String, ref: 'products', required: true },
        }
    ],
    shippingAddress: {
        name: String,
        address: { type: String, required: true },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
    },
    paymentMethod: { 
        type: String,
        enum: ['credit_card', 'paypal', 'stripe', 'bank_transfer'],
        required: true 
    },
    paymentResult: {
        id: { type: String },
        status: { type: String },
        update_time: { type: String },
        email_address: { type: String },
    },
    itemsPrice: async (_, { item }) => {
        const { orderItems } = item;
    
        const calcItemTotal = async ({ qty, productId }) => {
            const { price } = await data.get(`products:${productId}`);
            return price * qty;
        };
    
        const itemTotals = await Promise.all(orderItems.map(calcItemTotal));
        
        return itemTotals.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    },
    taxPrice: (_, { item }) => item.itemsPrice*0.08,
    shippingPrice: { type: Number },
    totalPrice: (_, { item }) => [
            item.itemsPrice,
            item.taxPrice,
            item.shippingPrice
        ]
        .filter(value => typeof value === 'number')
        .reduce((accumulator, currentValue) => accumulator + currentValue, 0),
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
});

export default orderSchema;