<template>
  <div class="grid p30">
    <!-- Select Role or User Option -->
    <div class="cell-1 p10b">
      <div class="grid">
        <div v-for="setting in state.showAdminTools" class="cell shrink p30r proper">
          <a href="#" class="colorBlack selectSetting"
          :class="{ underline : state.selectedSetting === setting }"   
          @click="state.selectedSetting=setting">
              {{ setting }}
          </a>
        </div>
      </div>
    </div>

    <!-- Scrolling Select Role Buttons -->
    <ScrollingContent v-if="state.selectedSetting=='select role'" class="p30b">
      <button class="role proper"
      :class="{ active : state.selectedRole === role }"
      @click="state.selectedRole=role" v-for="role in state.roles">
        {{ role }}
      </button>
    </ScrollingContent>

    <!-- Search Users Input -->
    <div v-if="state.selectedSetting=='select user'" class="cell-1 p10b">
      <div class="grid">
        <div class="cell-1">
          <div class="relative">
            <input 
            type="text" 
            class="searchUsers" 
            placeholder="Enter Username"
            v-model="state.email" />
            <!-- Conditional rendering for the clear button -->
            <button v-if="state.email" @click="state.email=''" class="clearButton">
              x
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected User Button -->
    <Transition>
      <div v-if="state.selectedSetting=='select user' && app.isUserSelected()" class="cell-1 p30b left">
        <button @click="state.email=''" class="email role active">{{ state.email }} <span class="mdi mdi-close-circle"></span></button>
      </div>
    </Transition>

    <!-- Matching User Scrollable Buttons -->
    <Transition>
      <div v-if="state.selectedSetting=='select user' && state.matchingUsers.length && !app.isUserSelected() && state.email" class="cell-1 p30b">
        <ScrollingContent>
          <button class="email role"
            v-for="user in state.matchingUsers"
            @click="state.email=user.email"
            :key="user.email">
              {{ user.email }}
          </button>
        </ScrollingContent>
      </div>
    </Transition>

    <!-- Draggable Visible -->
    <div class="cell-1 p30b">
      <div class="grid">
        <div class="cell-1-5">
          <div class="sectionTitle visibleViews">Visible Pages</div>
        </div>
        <div class="cell-4-5">
          <Transition>
            <DraggerVue v-if="state.showingViewButtons" group="viewsGroup" :state="state.views" :listName="'visible'"></DraggerVue>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Draggable Hidden Views -->
    <div class="cell-1">
      <div class="grid">
        <div class="cell-1-5">
          <div class="sectionTitle hiddenViews">Hidden Pages</div>
        </div>
        <div class="cell-4-5">
          <Transition>
            <DraggerVue v-if="state.showingViewButtons" group="viewsGroup" :state="state.views" :listName="'hidden'"></DraggerVue>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
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
    allViews: [],
    bodyBg: document.documentElement.style,
    email: '',
    matchingUsers: [],
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
    selectedRole: 'public',
    selectedSetting: 'select role',
    showAdminTools: [],
    showingViewButtons: false,
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

    function isSavingRoleSettings({ selectedSetting }) {
      return selectedSetting === 'select role';
    }

    function fetchUsers(email) {
      email = email.toLowerCase();
      return api.get(`api/allusers?email=${email}*`);
    }

    function hideViewButtons() {
      state.showingViewButtons = false;
    }

    async function loadAllViewsNames() {
      state.allViews = await api.get('/api/pages');
    }

    async function saveSettingsToSite(state) {
      const { selectedRole, views: { visible } } = state;
      const body = { views: { [selectedRole] : visible } };

      console.log({ body });
      // await api.post(`/api/updateSettings`, body);
    }

    async function saveUserSettings(user, { views }) {
      await api.put(`/api/users/${user.email}`, { views: views.visible });
    }

    function selectedUser() {
      return state.matchingUsers.filter(user => 
          state.email === user.email
      )[0];
    }

    function setViewsButtons(newViews) {
      const { allViews, views } = state;

      views.visible = newViews;
      views.hidden = allViews.filter(view => !newViews.includes(view));

      showViewButtons();
    }

    function showAdminTools() {
      state.showAdminTools = ['select role', 'select user'];
    }

    function showDefaultViewsButtons() {
      state.views.visible = state.allViews;
      state.views.hidden = [];

      showViewButtons();
    }

    function showViewButtons() {
      nextTick(() =>  state.showingViewButtons = true);
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

        await loadAllViewsNames();
        await app.loadViewButtonsForUserOrRole();
      },
      isUserSelected: () => {
        return !!selectedUser();
      },
      loadViewButtonsForUserOrRole: async function() {
        hideViewButtons();

        if(isSavingRoleSettings(state)) {
          // const roleSettings = site.views[state.selectedRole];
          
          // if(roleSettings) {
          //   return setViewsButtons(roleSettings);
          // }

          return showDefaultViewsButtons();
        }

        const user = selectedUser();

        if(!user) {
          return showDefaultViewsButtons();
        }

        setViewsButtons(user.views);
      },
      lookupUsers: async function(email) {         
        if (!email) {
          state.matchingUsers = [];
          showDefaultViewsButtons();
          return;
        }

        waitUntilTypingStops(
          async () => {
            state.matchingUsers = await fetchUsers(email);
            app.loadViewButtonsForUserOrRole();
          }
        );
      },
      resetBgColors: function() {
        changeBgColor('');
      },
      saveSettings: async function() {
        if(isSavingRoleSettings(state)) {
          await saveSettingsToSite(state);
          return;
        }

        const user = selectedUser();
        
        if(!user) {
          return;
        }

        await saveUserSettings(user, state);
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

  watch(() => state.views.visible, app.saveSettings);
  watch(() => state.email, app.lookupUsers);
  watch(() => state.selectedRole, app.loadViewButtonsForUserOrRole);
  watch(() => state.selectedSetting, app.loadViewButtonsForUserOrRole);

</script>

<style>
.clearButton {
  position: absolute;
  top: 50%;
  right: 5px;
  transform: translateY(-50%);
  cursor: pointer;
  background-color: #fff;
  box-shadow: none;
  border: none;
  font-size: 16px;
  color: #999;
}

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
  background-color: white;
  font-weight: 600;
  color: black;
  padding: 3px 25px;
  margin-right: 10px;
}

.role.active {
  background-color: #333;
  color: #fff;
}

.viewButton {
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