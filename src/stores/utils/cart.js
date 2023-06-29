import { ref } from 'vue';

const Cart = (function() {
    const state = {
        items: ref([]),
        total: () => state.items.value
        .reduce((acc, { price, qty }) => acc + price * qty, 0)
    };

    const findItem = (sku, data) => {
        const { value: items } = state.items;
        const index = items.findIndex(item => item.sku === sku);

        data.index = index;
    };
      

    const pushItem = (item) => state.items.value.push(item);

    const removeItem = ({ value: array }) => {
        array.splice(index, 1);
    };

    return {
        state,
        addItem: (item) => {
            pushItem(item);
            console.log(state.items.value);
        },
        removeItem: (sku) => {
            const index = findItem(sku);
            removeItem(index, state.items);
        },
        // changeQty: (item, qty) => [
        //     //updateItemInDb(item)
        // ],
        // saveForLater: (item) => [
        //     //updateItem item.active = false
        //     //updateItemInDb(item) => { updateItemInDb: item }
        // ],
        // placeOrder: []
    }
})();

export default Cart;