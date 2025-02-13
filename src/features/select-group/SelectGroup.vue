<template>
  <div class="bg-gray-50 p-8">
    <!-- Net-worth -->
    <div class="mb-8">
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-6 font-medium text-gray-900 shadow-sm">
        Net-Worth: <NetWorth :accounts="props.state.allUserAccounts" :state="props.state" />
      </div>
    </div>

    <div v-if="!isEditing">
      <!-- Groups List -->
      <div class="space-y-4 mb-8">
        <Draggable 
          v-model="props.state.allUserGroups" 
          v-bind="props.state.dragOptions(100)" 
          handle=".handlerGroup"
        >
          <template #item="{element}">
            <GroupRow 
              :key="element._id" 
              :app="app" 
              :element="element" 
              :state="props.state" 
            />
          </template>
        </Draggable>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-4">
        <!-- Link Account -->
        <button 
          @click="app.linkNewAccount" 
          class="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200 rounded-lg shadow-sm transition-colors font-medium"
        >
          <span v-if="props.state.linkToken">Link New Account +</span>
          <span v-else class="flex items-center justify-center">
            Loading <LoadingDots />
          </span>
        </button>

        <!-- Create Group -->
        <button 
          @click="app.createNewGroup" 
          class="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200 rounded-lg shadow-sm transition-colors font-medium"
        >
          Create New Group +
        </button>

        <!-- Update Institutions -->
        <button 
          @click="props.state.views.push('ItemRepair')" 
          class="w-full py-3 px-4 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border-2 border-yellow-200 rounded-lg shadow-sm transition-colors font-medium"
        >
          Update Existing Institutions
        </button>
      </div>
    </div>

    <!-- Edit Group View -->
    <div v-else>
      <EditGroup :state="props.state" @close="isEditing = false" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import GroupRow from './components/GroupRow.vue';
import NetWorth from './components/NetWorth.vue';
import Draggable from 'vuedraggable';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import EditGroup from './components/EditGroup.vue';
import { useSelectGroup } from './composables/useSelectGroup.js';

const props = defineProps({
  App: Object,
  state: Object
});

const isEditing = ref(false);
const app = useSelectGroup(props.state, props.App, isEditing);

app.init();

watch(() => props.state.allUserGroups, (groups) => {
  groups.forEach((group, groupIndex) => group.sort = groupIndex);
});
</script>

<style>
.net-worth {
  background-color: antiquewhite;
  color: #0000;
  margin-bottom: 20px;
  border: 1px solid #000;
  box-shadow: 3px 3px #000;
  border-radius: 3px;
  color: #000;
}

.select-group {
  background-color: #f4f8f9;
  padding: 30px 20px;
  font-weight: normal;
}

.linkAccount, .new-group, .item-repair {
  margin-bottom: 20px;
  box-shadow: 3px 3px #000;
  border: 1px solid #000;
  width: 100%;
}

.new-group, .linkAccount {
  background: lightblue;
  color: #000;
}

.item-repair {
  background: lightgoldenrodyellow;
  color: #000;
}
</style> 