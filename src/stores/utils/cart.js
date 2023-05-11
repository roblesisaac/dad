import { ref } from 'vue';
import { Aid } from '../../../api/utils/aidkit';

export default new Aid({
    state: {
        items: ref([]),
        total: (state) => {
            let total = 0;

            state.items.value.forEach(item => {
                const { price, qty } = item;
                total += price * qty;
            });

            return total;
        }
    },
    instruct: {
        addItem: (item) => [
            { push: item, to: 'items.value' },
            { log: 'items' }
            //addItemToDb
        ],
        removeItem: (index) => [
            { find: index, inside: 'items.value' },
            { cartItem: '_output' },
            { remove: index, from: 'items.value' },
            { log: 'output' }
            //removeItemFromDb
        ],
        // changeQty: (item, qty) => [
        //     //updateItemInDb(item)
        // ],
        // saveForLater: (item) => [
        //     //updateItem item.active = false
        //     //updateItemInDb(item) => { updateItemInDb: item }
        // ],
        // placeOrder: []
    }
});