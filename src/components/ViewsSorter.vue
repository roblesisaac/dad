<template>
  <div class="grid p30">
    <div class="cell-1 p30b">
      <div class="grid">
        <div class="cell-1-5">
          <p class="sectionTitle left">{{ state.active }}</p>
        </div>
        <div class="cell-4-5">
          <input type="text" class="searchUsers" />
        </div>
      </div>
    </div>
    <div class="cell-1 p30b">
      <div class="grid">
        <div class="cell-1-5">
          <div class="sectionTitle visibleViews">Visible Views</div>
        </div>
        <div class="cell-4-5">
          <DraggerVue group="viewsGroup" :state="state.views" :listName="'visible'"></DraggerVue>
        </div>
      </div>
    </div>
    <div class="cell-1">
      <div class="grid">
        <div class="cell-1-5">
          <div class="sectionTitle hiddenViews">Hidden Views</div>
        </div>
        <div class="cell-4-5">
          <DraggerVue group="viewsGroup" :state="state.views" :listName="'hidden'"></DraggerVue>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { reactive, onMounted, onBeforeUnmount } from 'vue';
  import { useAppStore } from '../stores/app';
  import DraggerVue from './DraggerVue.vue';

  const { api, sticky } = useAppStore();

  const stickys = [
    {
      selector: '.visibleViews',
      stickUnder: '.topNav',
      unstickWhen: {
        isSticky: '.hiddenViews'
      }
    },
    {
      selector: '.hiddenViews',
      stickUnder: '.topNav'
    }
  ];

  const state = reactive({
    active: 'roles',
    bg: document.documentElement.style,
    buttons: ['viewable pages'],
    topNav: document.querySelector('.topNav').style,
    views: {
      visible: [],
      hidden: ['bank']
    },
    user: null
  });
  
  const app = function() {
    function addTools() {
      return [...state.buttons, 'roles', 'users']
    }

    function changeBgColor(color='#efeff5') {
      state.topNav.backgroundColor = color;
      state.bg.backgroundColor = color;
    }

    async function loadAllViews({ views }) {
      // const users = await api.get('db/users');
      // console.log({ users });
      const fetchedViews = await api.get('/api/pages');

      views.visible = views.visible.concat(fetchedViews);
    }

    async function saveSettingsToSite() {
      await api.post(`/api/`);
    }

    async function saveSettingsToUser({ user }) {
      const views = state.views.visible;

      await api.post(`/api/users/${user._id}`, { views });
    }

    function userIs(roles) {
      return roles.includes('user.role');
    }

    return {
      async init() {
        changeBgColor();

        if(userIs(['admin', 'owner'])) {
          state.buttons = addTools();
        }

        await loadAllViews(state);
      },

      async saveSettings() {
        if(state.user) {
          await saveSettingsToUser(state);
          return;
        }

        await saveSettingsToSite();
      }
    };
  }();

  app.init();

  onMounted(() => {
    sticky.stickify(stickys);
  });

  onBeforeUnmount(() => {
    state.topNav.backgroundColor = '';
    state.bg.backgroundColor = '';
  });

</script>

<style scoped>
.searchUsers {
  border-radius: 10px;
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);
}
.sectionTitle {
  text-transform: capitalize;
  margin-right: 5px;
  text-align: left;
  font-size: 1.1em;
  font-weight: 500;
}

.hiddenViews, .visibleViews {
  padding-top: 5px;
  background-color: #efeff5;
}
</style>