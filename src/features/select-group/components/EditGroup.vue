<template>
  <div class="space-y-6">
    <!-- Group Name -->
    <div>
      <label class="block font-medium mb-2">Group Name:</label>
      <input 
        v-model="state.editingGroup.name" 
        @input="app.updateGroupName" 
        type="text"
        class="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <!-- Group Info -->
    <div>
      <label class="block font-medium mb-2">Group Info:</label>
      <textarea 
        v-model="state.editingGroup.info" 
        @input="app.updateGroup"
        rows="3"
        class="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      ></textarea>
    </div>

    <!-- Accounts List -->
    <div>
      <label class="block font-medium mb-4">Accounts:</label>
      <div class="space-y-3">
        <Draggable 
          v-model="state.editingGroup.accounts" 
          v-bind="state.dragOptions(100)" 
          handle=".handlerAccount"
          class="space-y-3"
        >
          <template #item="{element}">
            <div class="flex items-center justify-between bg-white p-4 rounded-lg border-2 border-gray-200">
              <div class="flex items-center space-x-3">
                <GripVertical class="handlerAccount w-5 h-5 text-gray-400 hover:text-gray-600 cursor-move" />
                <div>
                  <div class="font-medium">{{ element.name }}</div>
                  <div class="text-sm text-gray-600">
                    #{{ element.mask }} · {{ element.subtype }}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-medium">{{ formatPrice(element.balances?.current) }}</div>
                <div class="text-sm text-gray-600">Current Balance</div>
              </div>
            </div>
          </template>
        </Draggable>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex space-x-4">
      <button 
        @click="app.deleteGroup" 
        class="flex-1 py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 rounded-lg transition-colors font-medium"
      >
        Delete Group
      </button>
      <button 
        @click="$emit('close')" 
        class="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300 rounded-lg transition-colors font-medium"
      >
        Close
      </button>
    </div>
  </div>
</template>

<script setup>
import { GripVertical } from 'lucide-vue-next';
import Draggable from 'vuedraggable';
import { formatPrice } from '@/utils';
import { useEditGroup } from '../composables/useEditGroup';

const props = defineProps({
  state: Object
});

const app = useEditGroup(props.state);

defineEmits(['close']);
</script>