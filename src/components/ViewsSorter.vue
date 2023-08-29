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
    @click="state.selectedRole=role" v-for="role in state.allRoles">
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
          @keydown="app.onKeyDown"
          v-model="state.email" />
        <!-- Conditional rendering for the clear button -->
        <button v-if="state.email" @click="app.selectUser('')" class="clearButton">
          x
        </button>
      </div>
    </div>
  </div>
</div>


<!-- Selected User Button -->
<Transition>
  <div v-if="state.selectedSetting=='select user' && state.selectedUser" class="cell-1 p30b left">
    <button @click="app.selectUser('')" class="email role active">{{ state.email }} <CloseCircle />
    </button>
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
        <ViewDragger :class="{ 'dashed': !state.views.visible.length }" group="viewsGroup" v-if="state.showingViewButtons" app="viewsGroup" :state="state.views" :listName="'visible'" :onDblClick="app.onDblClick"></ViewDragger>
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
        <ViewDragger :class="{ 'dashed': !state.views.hidden.length }" group="viewsGroup" v-if="state.showingViewButtons" app="viewsGroup" :state="state.views" :listName="'hidden'"></ViewDragger>
      </Transition>
    </div>
  </div>
</div>
</div>
</template>

<script setup>
import { reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import CloseCircle from 'vue-material-design-icons/CloseCircle.vue';
import { useAppStore } from '../stores/app';
import ViewDragger from './ViewDragger.vue';
import ScrollingContent from './ScrollingContent.vue';
import { arraysMatch } from '../utils';

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
  allRoles: [],
  allViews: [],
  bodyBg: document.documentElement.style,
  email: '',
  matchingUsers: [],
  selectedRole: 'public',
  selectedUser: null,
  selectedSetting: 'select role',
  site: null,
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
  function allowedRoleViews(roleName) {
    roleName = roleName || state.selectedRole || 'public';
    
    const siteRoles = getSiteRolesArray(state.site);
    const closestRole = getClosestRole(state.allRoles, siteRoles, roleName);
    const role = state.site.roles.find(({ name }) => name === (closestRole));
    
    return role?.views;
  }
  
  function changeBgColor(color) {
    state.topNavBg.backgroundColor = state.bodyBg.backgroundColor = color;
  }
  
  function isSelectingRole() {
    return state.selectedSetting === 'select role';
  }
  
  async function fetchAllRoles() {
    state.allRoles = await api.get('/api/allroles');
  }
  
  async function fetchSite() {
    state.site = await api.get('api/sites');
  }
  
  function fetchUsers(email) {
    email = email.toLowerCase();
    return api.get(`api/allusers?email=${email}`);
  }
  
  function findAndUpdateRole() {
    const { 
      site: { roles }, 
      selectedRole, 
      views: { visible } 
    } = state;
    
    const update = { name: selectedRole, views: visible };
    
    if (!roles || !Array.isArray(roles)) {
      throw new Error('Invalid input object or roles array is missing.');
    }
    
    let found = false;
    const updatedRoles = roles.map(role => {
      if (role.name === selectedRole) {
        found = true;
        return { ...update };
      }
      
      return { ...role };
    });
    
    if (!found) {
      updatedRoles.push({ ...update });
    }
    
    state.site.roles = updatedRoles;
  }
  
  function getClosestRole(allRoles, siteRoles, inputRole) {
    if(siteRoles.includes(inputRole)) {
      return inputRole;
    }
    
    const userRoleIndex = allRoles.indexOf(inputRole);
    let highestRoleIndex = -1;
    
    for(const role of siteRoles) {
      const roleIndex = allRoles.indexOf(role);
      
      if(roleIndex > userRoleIndex) {
        continue;
      }
      
      if(roleIndex > highestRoleIndex) highestRoleIndex = roleIndex;
    }
    
    return allRoles[highestRoleIndex];
  }
  
  function getSiteRolesArray(site) {
    if(!site.roles) {
      throw new Error('Site is missing roles...');
    }
    
    return site.roles.map(role => role.name);
  }
  
  function hideViewButtons() {
    state.showingViewButtons = false;
  }
  
  async function loadAllViewsNames() {
    state.allViews = await api.get('/api/pages');
  }
  
  async function saveSettingsToSite() {
    const { site } = state;
    await api.put(`/api/sites/${site._id}`, site);
  }
  
  async function saveUserSettings(_id, body) {
    await api.put(`/api/users/${_id}`, body);
  }
  
  function selectedUsersAllowedViews() {
    const user = state.selectedUser;
    
    return user?.views?.length || user?.hideAllViews
    ? user?.views
    : allowedRoleViews(user?.role);
  }
  
  function setViewsButtons(newViews=[]) {
    const { allViews, views } = state;
    
    views.visible = newViews;
    views.hidden = allViews.filter(view => !newViews.includes(view));
    
    showViewButtons();
  }
  
  function showAdminTools() {
    state.showAdminTools = ['select role', 'select user'];
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
    init: async () => {
      onMounted(() => sticky.stickify(stickys));
      onBeforeUnmount(() => app.resetBgColors());
      
      watch(() => state.selectedRole, app.loadViewButtons);
      watch(() => state.selectedSetting, app.loadViewButtons);
      watch(() => state.views.visible, app.saveSettings);
      
      changeBgColor('#efeff5');
      
      if(userIs(['admin', 'owner'])) {
        showAdminTools();
      }
      
      await fetchSite();
      await fetchAllRoles();
      await loadAllViewsNames();
      await app.loadViewButtons();
    },
    loadViewButtons: async () => {
      hideViewButtons();
      
      if(isSelectingRole()) {
        return setViewsButtons(allowedRoleViews());
      }
      
      setViewsButtons(selectedUsersAllowedViews());
    },
    lookupUser: async (email) => { 
      if (!email) {
        state.selectedUser = null;
        setViewsButtons(allowedRoleViews());
        return;
      }
      
      state.selectedUser = await fetchUsers(email);
      app.loadViewButtons();
    },
    onDblClick: (_, view) => {
      // const indexOfView = getViewIndex(view);
      // renderEditFormForVisibleView(indexOfView);
    },
    onKeyDown: (event) => {
      if (event.keyCode === 13) {
        app.lookupUser(state.email);
      }
    },
    resetBgColors: () => {
      changeBgColor('');
    },
    saveSettings: async () => {
      if(!state.showingViewButtons) {
        return;
      }
      
      if(isSelectingRole()) {
        findAndUpdateRole();
        await saveSettingsToSite();
        return;
      }
      
      const { selectedUser } = state;
      
      if(!selectedUser) {
        return;
      }
      
      const { views: { visible } } = state;
      
      const body = {
        views: visible,
        hideAllViews: !visible.length
      };
      
      if(arraysMatch(visible, allowedRoleViews(selectedUser.role))) {
        body.views = [];
        body.hideAllViews = false;
      }
      
      await saveUserSettings(selectedUser._id, body);
    },
    selectUser: (email) => {
      state.email=email;
      app.lookupUser(email);
    }
  };
}();

app.init();

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

.dashed {
  height: 50px;
  border: 1px dashed #999;
  border-radius: 3px;
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