<template>
<div class="grid">

  <div v-if="itemState.syncedItems.length" class="cell-1">
    
    <div v-for="item in itemState.syncedItems" :key="item.item_id" class="grid p20 dottedRow">
      <div class="cell auto proper bold left">
        {{ item.institution_id }}
        <br />{{ item.item_id }}
      </div>
      
      <div v-if="item.error" class="cell shrink">
        <button @click="app.repairItem(item.item_id)" class="repair button">Repair</button>
      </div>
      <button v-else @click="app.repairItem(item.item_id)" class="button reconnect">
        Reconnect
      </button>
    </div>
    
  </div>

</div>
</template>

<script setup>
import { reactive } from 'vue';
import { useAppStore } from '../stores/state';

const { api } = useAppStore();

const itemState = reactive({
  syncedItems: []
});

const app = function() {
  function createLink(token) {
    return Plaid.create({
      token,
      onSuccess: async function(publicToken) {
        console.log(publicToken);
      },
      onExit: function(err, metadata) {
        console.log('Link exit:', { err, metadata });
      },
    });
  }

  async function syncItems() {
    const response = await api.get('api/plaid/sync/items');

    return response;
  }

  return {
    init: async () => {
      itemState.syncedItems = [ ...itemState.syncedItems, ... await syncItems() ];
    },
    repairItem: async (itemId) => {
      const linkToken = await api.post(`api/plaid/connect/link/${itemId}`);
      const link = createLink(linkToken);

      link.open();
    }
  }
}();

app.init();

</script>

<style scoped>
.reconnect {
  background: lightblue;
  color: #000;
}
.repair {
  background: lightcoral;
  color: #000;
}
.button {
  margin-bottom: 20px;
  box-shadow: 3px 3px #000;
  border: 1px solid #000;
  padding: 10px;
}
</style>