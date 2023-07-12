<template>
  <draggable class="grid" :animation="50" :touchStartThreshold="100" v-model="list">
    <div class="cell-1-3" v-for="view in state.views" :key="view+view.length">
      <div class="p5">
        <div class="bgGray pointer r3 p20y">
          {{  view }}
        </div>
      </div>
    </div>
  </draggable>
</template>

<script setup>
  import { reactive } from 'vue';
  import { useAppStore } from '../stores/app';
  import { VueDraggableNext as draggable } from 'vue-draggable-next';

  const { api } = useAppStore();

  const state = reactive({
    buttons: ['viewable pages'],
    views: []
  });
  
  const app = function() {
    function addTools() {
      return [...state.buttons, 'roles', 'users']
    }

    async function loadAllViews() {
      // const users = await api.get('db/users');
      // console.log({ users });

      state.views = state.views.concat([
        'settings',
        'profile',
        'apps',
        'store',
        'inventory'
      ]);
    }

    function userIs(roles) {
      return roles.includes('user.role');
    }

    return {
      async init() {
        if(userIs(['admin', 'owner'])) {
          state.buttons = addTools();
        }

        await loadAllViews();
        console.log('all done...');
      }
    };
  }();

  app.init()
</script>