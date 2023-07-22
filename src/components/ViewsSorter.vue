<template>
  <div class="grid p30">
    <div class="cell-1 p10b">
      <div class="grid">
        <div v-for="setting in state.showAdminTools" class="cell shrink p30r proper">
          <a href="#" class="colorBlack selectSetting"
          :class="{ underline : state.activeSetting === setting }"   
          @click="state.activeSetting=setting">
              {{ setting }}
          </a>
        </div>
      </div>
    </div>

    <ScrollingContent v-if="state.activeSetting=='select role'" class="p30b">
      <button class="role proper"
      :class="{ active : state.activeRole === role }"
      @click="state.activeRole=role" v-for="role in state.roles">
        {{ role }}
      </button>
    </ScrollingContent>

    <div v-if="state.activeSetting=='select user'" class="cell-1 p10b">
      <div class="grid">
        <div class="cell-1">
          <input 
            type="text" 
            class="searchUsers" 
            placeholder="Enter Username"
            v-model="state.email" />
        </div>
      </div>
    </div>

    <Transition>
      <div class="cell-1 p30b">
        <ScrollingContent v-if="state.activeSetting=='select user' && state.potentialUsers.length">
          <button class="email role"
            v-for="user in state.potentialUsers"            
            v-if="user.email"
            :key="user.email">
              {{ user.email }}
          </button>
        </ScrollingContent>
      </div>
    </Transition>

    <div class="cell-1 p30b">
      <div class="grid">
        <div class="cell-1-5">
          <div class="sectionTitle visibleViews">Visible Pages</div>
        </div>
        <div class="cell-4-5">
          <DraggerVue group="viewsGroup" :state="state.views" :listName="'visible'"></DraggerVue>
        </div>
      </div>
    </div>
    <div class="cell-1">
      <div class="grid">
        <div class="cell-1-5">
          <div class="sectionTitle hiddenViews">Hidden Pages</div>
        </div>
        <div class="cell-4-5">
          <DraggerVue group="viewsGroup" :state="state.views" :listName="'hidden'"></DraggerVue>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { reactive, onMounted, onBeforeUnmount, watch } from 'vue';
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
    activeRole: 'public',
    activeSetting: 'select role',
    bodyBg: document.documentElement.style,
    email: '',
    potentialUsers: [{ email: 'irobles1030@gmail.com' }],
    roles: [
      'public',
      'guest',
      'member',
      'bronze',
      'silver',
      'gold',
      'platinum',
      'diamond',
      'moderator',
      'admin',
      'owner'
    ],
    showAdminTools: [],
    topNavBg: document.querySelector('.topNav').style,
    typingTimer: null,
    views: {
      visible: [],
      hidden: []
    }
  });
  
  const app = function() {
    function changeBgColor(color) {
      state.topNavBg.backgroundColor = state.bodyBg.backgroundColor = color;
    }

    function isSavingRoleSettings({ activeSetting }) {
      return activeSetting === 'select role';
    }

    function fetchUsers(email) {
      email = email.toLowerCase();
      return api.get(`api/allusers?email=${email}*`);
    }

    async function loadAllViews({ views }) {
      const fetchedViews = await api.get('/api/pages');
      views.visible = fetchedViews;
    }

    async function saveSettingsToSite(state) {
      const { activeRole, views: { visible } } = state;
      const body = { views: { [activeRole] : visible } };

      console.log({ saved: body });
      // await api.post(`/api/updateSettings`, body);
    }

    async function saveUserSettings(state) {
      const { user, view: { visible }} = state;

      await api.post(`/api/users/${user._id}`, { views });
    }

    function showAdminTools() {
      state.showAdminTools = ['select role', 'select user'];
    }

    function userIs(roles) {
      return !!roles;
      // return roles.includes('user.role');
    }

    function waitUntilTypingStops(callback) {
      clearTimeout(state.typingTimer);
      state.typingTimer = setTimeout(callback, 500);
    }

    return {
      init: async function() {
        changeBgColor('#efeff5');

        if(userIs(['admin', 'owner'])) {
          showAdminTools();
        }

        await loadAllViews(state);
      },
      resetBgColors: function() {
        changeBgColor('');
      },
      isMatchingUser: (user) => {
        console.log(user);
        return true;
      },
      lookupUsers: async function(email) {         
        if (!email) {
          return;
        }

        waitUntilTypingStops(
          async () => {
            state.potentialUsers = await fetchUsers(email);
          }
        );
      },
      saveSettings: async function() {
        if(isSavingRoleSettings(state)) {
          await saveSettingsToSite(state);
          return;
        }

        await saveUserSettings(state);
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

  watch(() => state.views.visible, () => app.saveSettings());
  watch(() => state.email, app.lookupUsers);

</script>

<style>
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

.selectSetting:hover {
  color: black;
}

.hiddenViews, .visibleViews {
  padding-top: 5px;
  background-color: #efeff5;
}

.role {
  background-color: rgba(0, 0, 0, 0.1);
  font-weight: 600;
  color: black;
  padding: 3px 30px;
  margin-right: 10px;
}

.role.active {
  background-color: #333;
  color: #fff;
}

.viewButton {
  border: 1px solid #ddd;
  border-radius: 10px;
  font-weight: 600;
  width: 100%;
  padding: 15px 30px;
  position: relative;
  background-color: white;
  color: #333;
  box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.1);
}
</style>