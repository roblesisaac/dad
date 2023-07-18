<template>
  <div class="grid p30">
    <div class="cell-1 p10b">
      <div class="grid">
        <div v-for="tool in state.showAdminTools" class="cell shrink p30r proper">
          <a href="#" class="colorBlack"
          :class="{ underline : state.active === tool }"   
          @click="state.active = tool">
              {{ tool }}
          </a>
        </div>
      </div>
    </div>

    <Transition>
    <div v-if="state.active=='select user'" class="cell-1 p30b">
      <div class="grid">
        <div class="cell-1">
          <input type="text" class="searchUsers" />
        </div>
      </div>
    </div>
    </Transition>

    <Transition>
    <ScrollingContent v-if="state.active=='select role'" class="p30b">
      <button class="item" v-for="item in [1,2,3,4,5,6]">{{  item }}</button>
    </ScrollingContent>
    </Transition>

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
  import ScrollingContent from './ScrollingContent.vue';

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
    active: 'select role',
    bg: document.documentElement.style,
    showAdminTools: [],
    topNav: document.querySelector('.topNav').style,
    views: {
      visible: [],
      hidden: []
    },
    user: null
  });
  
  const app = function() {
    function changeBgColor(color='#efeff5') {
      state.topNav.backgroundColor = state.bg.backgroundColor = color;
    }

    async function loadAllViews({ views }) {
      const fetchedViews = await api.get('/api/pages');
      views.visible = fetchedViews;
    }

    async function saveSettingsToSite() {
      await api.post(`/api/`);
    }

    async function saveSettingsToUser({ user }) {
      const views = state.views.visible;

      await api.post(`/api/users/${user._id}`, { views });
    }

    function showAdminTools() {
      state.showAdminTools = ['select role', 'select user'];
    }

    function userIs(roles) {
      return true;
      // return roles.includes('user.role');
    }

    return {
      async init() {
        changeBgColor();

        if(userIs(['admin', 'owner'])) {
          showAdminTools();
        }

        await loadAllViews(state);
      },

      resetBgColors() {
        changeBgColor('');
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
    app.resetBgColors();
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

.item {
  width: 200px;
  background-color: lightgray;
  margin-right: 10px;
}
</style>