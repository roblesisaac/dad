<template>
<div class="x-grid select-group">
  <!-- Net-worth -->
  <div class="cell-1 net-worth bold p30">
    Net-Worth: <NetWorth :accounts="state.allUserAccounts" :digits="0" />
  </div>

  <div v-if="!isEditing">
    <Draggable v-model="state.allUserGroups" v-bind="dragOptions(100)" handle=".handlerGroup" class="cell-1">
      <template #item="{element}">
        <GroupRow :key="element._id" :app="app" :element="element" />
      </template>
    </Draggable>

    <!-- LinkNewAccount -->
    <button @click="app.linkNewAccount" href="#" class="linkAccount proper colorBlue">
      <b v-if="state.linkToken">Link New Account +</b>
      <b v-else>Loading <LoadingDots /></b>
    </button>

    <!-- Create New Group -->
    <div class="cell-1 proper">
      <button @click="app.createNewGroup" class="button expanded new-group">Create New Group +</button>
    </div>

    <!-- Reconnect Existing Institutions -->
    <div class="cell-1 proper">
      <button @click="router.push({ name: 'onboarding' })" 
              class="button expanded item-repair">Update Existing Institutions</button>
    </div>
  </div>

  <div v-else class="cell-1">
    <EditGroup @close="isEditing = false" />
  </div>
</div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import GroupRow from '../components/GroupRow.vue';
import NetWorth from '../components/NetWorth.vue';
import LoadingDots from '@/shared/components/LoadingDots.vue';
import EditGroup from '../components/EditGroup.vue';
import { useSelectGroup } from '../composables/useSelectGroup.js';
import { useDraggable } from '@/shared/composables/useDraggable';

const { Draggable, dragOptions } = useDraggable();
const router = useRouter();
const { state, actions } = useDashboardState();
const isEditing = ref(false);

const app = useSelectGroup(state, actions, isEditing);

app.init();

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