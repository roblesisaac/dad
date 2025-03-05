<template>
<div class="x-grid select-group">
  <!-- Net-worth -->
  <div class="cell-1 net-worth bold p30">
    Net-Worth: <NetWorth :accounts="state.allUserAccounts" :digits="0" />
  </div>

  <div v-if="!editingGroup">
    <Draggable v-model="state.allUserGroups" v-bind="dragOptions(100)" handle=".handler-group" class="cell-1">
      <template #item="{element}">
        <GroupRow :key="element._id" :element="element" @edit-group="editingGroup = element" />
      </template>
    </Draggable>

    <!-- Create New Group -->
    <div class="cell-1 proper">
      <button @click="createNewGroup" class="button expanded new-group">Create New Group +</button>
    </div>

    <!-- Reconnect Existing Institutions -->
    <div class="cell-1 proper">
      <button @click="router.push({ name: 'onboarding' })" 
              class="button expanded item-repair">Update Existing Institutions</button>
    </div>
  </div>

  <div v-else class="cell-1">
    <EditGroup @close="editingGroup = null" :group="editingGroup" />
  </div>
</div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import GroupRow from '../components/GroupRow.vue';
import NetWorth from '../components/NetWorth.vue';
import EditGroup from '../components/EditGroup.vue';
import { useEditGroup } from '../composables/useEditGroup.js';
import { useDraggable } from '@/shared/composables/useDraggable';

const { Draggable, dragOptions } = useDraggable();
const router = useRouter();
const { state } = useDashboardState();
const editingGroup = ref(null);

const { createNewGroup } = useEditGroup();

watch(() => state.allUserGroups, (groups) => {
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