<template>
<div class="grid select-group">
  <!-- Net-worth -->
  <div class="cell-1 net-worth bold p30">
    Net-Worth: <NetWorth :accounts="props.state.allUserAccounts" :state="state" />
  </div>

  <!-- Only show main content when not editing -->
  <div v-if="!props.state.is('EditGroup')">
    <Draggable v-model="props.state.allUserGroups" v-bind="props.state.dragOptions(100)" handle=".handlerGroup" class="cell-1">
      <template #item="{element}">
        <GroupRow :key="element._id" :app="app" :element="element" :state="state" />
      </template>
    </Draggable>

    <!-- LinkNewAccount -->
    <button @click="app.linkNewAccount" href="#" class="linkAccount proper colorBlue">
      <b v-if="props.state.linkToken">Link New Account +</b>
      <b v-else>Loading <LoadingDots /></b>
    </button>

    <!-- Create New Group -->
    <div class="cell-1 proper">
      <button @click="app.createNewGroup" class="button expanded new-group">Create New Group +</button>
    </div>

    <!-- Reconnect Existing Institutions -->
    <div class="cell-1 proper">
      <button @click="props.state.views.push('ItemRepair')" class="button expanded item-repair">Update Existing Institutions</button>
    </div>
  </div>

  <!-- EditGroup -->
  <div v-else class="cell-1">
    <EditGroup :state="props.state" />
  </div>

</div>
</template>

<script setup>
import { watch } from 'vue';
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

const app = useSelectGroup(props.state, props.App);

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