<template>
  <div class="p-5 text-left">
    <!-- Back button -->
    <div class="mb-4">
      <button 
        @click="$emit('close')" 
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span class="mr-2">←</span> Back
      </button>
    </div>

    <!-- Group Name and Info -->
    <div class="mb-6 space-y-4">
      <div class="flex items-center gap-4">
        <label class="font-semibold w-24">Name:</label>
        <input 
          type="text" 
          v-model="props.state.editingGroup.name" 
          class="flex-1 px-3 py-2 border-0 border-b-2 border-blue-500 focus:ring-0 focus:border-blue-700 bg-transparent font-semibold text-blue-600"
        />
      </div>

      <div class="space-y-2">
        <label class="font-semibold block">Info:</label>
        <textarea 
          v-model="props.state.editingGroup.info" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
        ></textarea>
      </div>
    </div>

    <!-- Accounts In Group -->
    <div class="mb-6">
      <h3 class="font-semibold mb-2">Accounts In Group:</h3>
      <div class="min-h-[100px] p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <span v-if="!props.state.editingGroup.accounts.length" class="text-gray-500">
          Drag and drop accounts here.
        </span>
        <Draggable 
          class="space-y-2" 
          group="accountDragger" 
          v-model="props.state.editingGroup.accounts" 
          v-bind="props.state.dragOptions()"
        >
          <template #item="{element}">
            <div class="inline-block px-3 py-1 m-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              {{ element.mask }}
            </div>
          </template>
        </Draggable>
      </div>
    </div>

    <!-- Accounts Not In Group -->
    <div class="mb-6">
      <h3 class="font-semibold mb-2">Accounts Not In Group:</h3>
      <div class="min-h-[100px] p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <Draggable 
          class="space-y-2" 
          group="accountDragger" 
          v-model="accountsNotInGroup" 
          v-bind="props.state.dragOptions()"
        >
          <template #item="{element}">
            <div class="inline-block px-3 py-1 m-1 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200">
              {{ element.mask }}
            </div>
          </template>
        </Draggable>
      </div>
    </div>

    <!-- Delete Button -->
    <div>
      <button 
        @click="deleteGroup" 
        class="w-full px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-200"
      >
        Remove Group
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import Draggable from 'vuedraggable';
import { useEditGroup } from '../composables/useEditGroup.js';

const props = defineProps({
  state: Object
});

defineEmits(['close']);

const { deleteGroup, updateGroupName, updateGroup } = useEditGroup(props.state);

const accountsNotInGroup = computed(() => {
  const accountsInGroup = props.state.editingGroup.accounts.map(account => account._id);

  return props.state.allUserAccounts.filter(account => {
    return !accountsInGroup.includes(account._id);
  });
});

watch(() => props.state.editingGroup.name, updateGroupName);
watch(() => props.state.editingGroup.info, updateGroup);
watch(() => props.state.editingGroup.accounts.length, updateGroup);

</script>