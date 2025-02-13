<template>
<div class="p-8">
		
	<!-- Select Role or User Option -->
	<div class="mb-4">
		<div class="flex space-x-8">
			<button 
			v-for="setting in state.showAdminTools" 
			:key="setting"
			@click="state.selectedSetting=setting"
			class="capitalize text-gray-700 hover:text-black transition-colors"
			:class="{ 'border-b-2 border-black font-medium': state.selectedSetting === setting }"
			>
			{{ setting }}
			</button>
		</div>
	</div>
	
	<!-- Role Selection -->
	<ScrollingContent 
	v-if="state.selectedSetting=='select role'" 
	class="mb-8 overflow-x-auto whitespace-nowrap"
	>
		<div class="flex space-x-2 p-2">
			<button 
			v-for="role in state.allRoles"
			:key="role"
			@click="state.selectedRole=role"
			class="px-6 py-2 rounded-md font-medium transition-colors capitalize"
			:class="[
			state.selectedRole === role 
			? 'bg-gray-900 text-white' 
			: 'bg-white text-gray-700 hover:bg-gray-50'
			]"
			>
			{{ role }}
			</button>
		</div>
	</ScrollingContent>

	<!-- User Selection -->
	<div v-if="state.selectedSetting=='select user'" class="mb-4">
		<div class="relative">
			<input 
			type="text" 
			class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			placeholder="Enter Username"
			@keydown="app.onKeyDown"
			v-model="state.email" />
			<button 
			v-if="state.email" 
			@click="app.selectUser('')"
			class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
			>
			x
			</button>
		</div>
	</div>

	<!-- Selected User -->
	<Transition>
		<div 
		v-if="state.selectedSetting=='select user' && state.selectedUser" 
		class="mb-8 text-left"
		>
			<button 
			@click="app.selectUser('')" 
			class="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
			>
			{{ state.email }}
			<X class="ml-2 w-4 h-4" />
			</button>
		</div>
	</Transition>

	<!-- Visible Pages Section -->
	<div class="mb-8">
		<div class="grid grid-cols-5 gap-4">
			<div class="sticky top-0 bg-gray-50 p-4 rounded-md">
				<h3 class="font-medium text-gray-900">Visible Pages</h3>
			</div>
			<div class="col-span-4">
				<Transition>
					<ViewDragger 
					:class="{ 'border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[100px]': !state.views.visible.length }" 
					group="viewsGroup" 
					v-if="state.showingViewButtons" 
					app="viewsGroup" 
					:state="state.views" 
					:listName="'visible'" 
					:onDblClick="app.onDblClick"
					/>
				</Transition>
			</div>
		</div>
	</div>

	<!-- Hidden Pages Section -->
	<div>
		<div class="grid grid-cols-5 gap-4">
			<div class="sticky top-0 bg-gray-50 p-4 rounded-md">
				<h3 class="font-medium text-gray-900">Hidden Pages</h3>
			</div>
			<div class="col-span-4">
				<Transition>
					<ViewDragger 
					:class="{ 'border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[100px]': !state.views.hidden.length }" 
					group="viewsGroup" 
					v-if="state.showingViewButtons" 
					app="viewsGroup" 
					:state="state.views" 
					:listName="'hidden'"
					/>
				</Transition>
			</div>
		</div>
	</div>

</div>
</template>

<script setup>
import { reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { X } from 'lucide-vue-next';
import { useAppStore } from '@/stores/state';
import ViewDragger from './ViewDragger.vue';
import ScrollingContent from '@/shared/components/ScrollingContent.vue';
import { arraysMatch } from '@/utils';

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
			
			changeBgColor('rgb(243, 243, 238)');
			
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