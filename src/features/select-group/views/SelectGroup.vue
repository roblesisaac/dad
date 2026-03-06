<template>
  <div :class="containerClasses">
    <template v-if="isDashboardVariant">
      <DashboardGroupSelector
        :rearrange-active="rearrangeActive"
        @group-selected="emit('group-selected', $event)"
      />
    </template>

    <template v-else>
      <!-- Net-worth Header -->
      <div class="py-5 border-b theme-border flex items-center justify-between">
        <h4 class="text-[10px] font-black uppercase tracking-widest theme-text-muted">Total Net Balance</h4>
        <div class="text-xl font-black theme-text tracking-tight">
          <NetBalance :accounts="state.allUserAccounts" :digits="0" />
        </div>
      </div>

      <!-- Custom Groups Section -->
      <div class="py-4">
        <div
          class="flex items-center justify-between mb-4 cursor-pointer group"
          @click="toggleCustomGroups"
        >
          <div class="flex items-center gap-2">
            <h2 class="text-[10px] font-black uppercase tracking-widest theme-text">Banking Groups</h2>
            <span class="text-[10px] font-black theme-text-muted">{{ customGroups.length }}</span>
          </div>
          <div class="theme-text-muted group-hover:theme-text transition-colors">
            <ChevronDown v-if="showCustomGroups" class="w-4 h-4" />
            <ChevronRight v-else class="w-4 h-4" />
          </div>
        </div>

        <div v-if="showCustomGroups" class="space-y-2">
          <Draggable
            v-model="customGroups"
            v-bind="dragOptions"
            handle=".handler-group"
            @end="updateGroupSorting"
            :disabled="!editMode"
            class="space-y-2"
            :class="{'edit-mode-container': editMode}"
          >
            <template #item="{element}">
              <GroupRow
                :key="element._id"
                :element="element"
                :editMode="editMode"
                @edit-group="openEditGroupModal(element)"
                @select-group="handleSelectGroup(element)"
              />
            </template>
          </Draggable>

          <div v-if="customGroups.length === 0" class="py-8 text-center text-xs font-bold theme-text-muted uppercase tracking-widest">
            No custom groups
          </div>

          <!-- Create New Group Button (Inside Custom Groups) -->
          <div v-if="editMode" class="mt-4">
            <button
              @click="handleCreateNewGroup"
              class="theme-btn-primary group w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle class="w-3.5 h-3.5" />
              Create Group
            </button>
          </div>
        </div>
      </div>

      <!-- Bank Accounts Section -->
      <div class="py-4 border-t theme-border">
        <div
          class="flex items-center justify-between mb-4 cursor-pointer group"
          @click="toggleBankAccounts"
        >
          <div class="flex items-center gap-2">
            <h2 class="text-[10px] font-black uppercase tracking-widest theme-text">Raw Accounts</h2>
            <span class="text-[10px] font-black theme-text-muted">{{ bankAccounts.length }}</span>
          </div>
          <div class="theme-text-muted group-hover:theme-text transition-colors">
            <ChevronDown v-if="showBankAccounts" class="w-4 h-4" />
            <ChevronRight v-else class="w-4 h-4" />
          </div>
        </div>

        <div v-if="showBankAccounts" class="space-y-2">
          <Draggable
            v-model="bankAccounts"
            v-bind="dragOptions"
            handle=".handler-group"
            @end="updateGroupSorting"
            :disabled="!editMode"
            class="space-y-2"
            :class="{'edit-mode-container': editMode}"
          >
            <template #item="{element}">
              <GroupRow
                :key="element._id"
                :element="element"
                :editMode="editMode"
                @edit-group="openEditGroupModal(element)"
                @select-group="handleSelectGroup(element)"
              />
            </template>
          </Draggable>

          <div v-if="bankAccounts.length === 0" class="py-8 text-center text-xs font-bold theme-text-muted uppercase tracking-widest">
            No bank accounts
          </div>
        </div>
      </div>

      <!-- Management Actions -->
      <div v-if="!editMode" class="py-6 border-t theme-border bg-soft">
        <div class="grid grid-cols-2 gap-3">
          <button
            @click="goToOnboarding"
            class="px-4 py-4 theme-bg border theme-border hover:border-black rounded-2xl text-[10px] font-black uppercase tracking-widest theme-text-muted hover:theme-text transition-all flex flex-col items-center justify-center gap-2 text-center"
          >
            <RefreshCw class="w-4 h-4" />
            Re-Sync All
          </button>

          <button
            @click="handleManageBanks"
            class="px-4 py-4 theme-bg-element border theme-border hover:border-black rounded-2xl text-[10px] font-black uppercase tracking-widest theme-text-muted hover:theme-text transition-all flex flex-col items-center justify-center gap-2 text-center"
          >
            <Building class="w-4 h-4" />
            Manage Banks
          </button>
        </div>
      </div>
    </template>

    <!-- Edit Group Modal -->
    <EditGroupModal
      v-if="showEditGroupModal"
      :is-open="showEditGroupModal"
      :group="editingGroup"
      @close="closeEditGroupModal"
      @delete-group="handleDeleteGroup"
    />
    
    <!-- Banks Modal -->
    <BanksModal
      v-if="showBanksModal"
      :is-open="showBanksModal"
      @close="showBanksModal = false"
      @connect-bank-complete="handleBankConnected"
      @banks-data-changed="handleBanksDataChanged"
    />
    
    <BaseModal
      v-if="showRenameModal"
      :is-open="showRenameModal"
      size="md"
      :title="renameModalTitle"
      @close="closeRenameModal"
    >

      <template #content>
        <div class="px-6 py-8">
          <label class="block text-[10px] font-black theme-text-muted uppercase tracking-widest mb-2 px-1">
            Name
          </label>
          <input
            v-model="renameInput"
            type="text"
            class="w-full px-5 py-4 theme-bg-element border theme-border rounded-2xl text-base font-black tracking-tight theme-text-placeholder focus:outline-none focus:border-black transition-all"
            :placeholder="renamePlaceholder"
          />
        </div>
        <div class="py-8 border-t theme-border flex items-center gap-3">
          <button
            @click="closeRenameModal"
            class="flex-grow px-6 py-4 bg-soft hover:bg-[var(--theme-bg-subtle)] theme-text-muted hover:theme-text text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveRename"
            class="flex-grow px-6 py-4 theme-btn-primary hover:opacity-80 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
            type="button"
          >
            Save
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showDuplicateModal"
      :is-open="showDuplicateModal"
      size="md"
      @close="closeDuplicateModal"
    >
      <template #header>
        <div class="px-6 py-6 border-b-2 border-gray-50 flex items-center justify-between">
          <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Duplicate Group</h2>
          <button
            @click="closeDuplicateModal"
            class="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-black focus:outline-none"
            type="button"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </template>
      <template #content>
        <div class="px-6 py-8">
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
            New Group Name
          </label>
          <input
            v-model="duplicateInput"
            type="text"
            class="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-base font-black tracking-tight placeholder:text-gray-200 focus:outline-none focus:border-black transition-all"
            placeholder="copy of group"
          />
        </div>
        <div class="px-6 py-8 border-t-2 border-gray-50 flex items-center gap-3">
          <button
            @click="closeDuplicateModal"
            class="flex-grow px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveDuplicate"
            class="flex-grow px-6 py-4 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
            type="button"
          >
            Save
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showDeleteModal"
      :is-open="showDeleteModal"
      size="md"
      @close="closeDeleteModal"
    >
      <template #header>
        <div class="px-6 py-6 border-b-2 border-gray-50 flex items-center justify-between">
          <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Remove Group</h2>
          <button
            @click="closeDeleteModal"
            class="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-black focus:outline-none"
            type="button"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </template>
      <template #content>
        <div class="px-6 py-8 space-y-4">
          <p class="text-sm font-black text-gray-700 tracking-tight">
            Type <span class="uppercase">delete</span> to remove "{{ actionTargetName }}".
          </p>
          <input
            v-model="deleteInput"
            type="text"
            class="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-base font-black tracking-tight placeholder:text-gray-200 focus:outline-none focus:border-black transition-all"
            placeholder="delete"
          />
        </div>
        <div class="px-6 py-8 border-t-2 border-gray-50 flex items-center gap-3">
          <button
            @click="closeDeleteModal"
            class="flex-grow px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveDelete"
            class="flex-grow px-6 py-4 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-40"
            :disabled="deleteInput.trim().toLowerCase() !== 'delete'"
            type="button"
          >
            Remove Group
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showEditAccountsModal"
      :is-open="showEditAccountsModal"
      title="Edit Accounts"
      size="md"
      @close="closeEditAccountsModal"
    >
      <template #content>
        <div class="py-2">
          <div v-for="account in enabledAccountsForEditing" :key="accountKey(account)" class="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div class="flex flex-col min-w-0 pr-4">
              <span class="text-base font-black text-gray-900 tracking-tight truncate">{{ accountDisplayName(account) }}</span>
              <span class="text-[10px] font-black text-black uppercase tracking-widest mt-0.5">Mask: {{ account.mask }}</span>
            </div>
            <Switch
              :model-value="true"
              :id="`group-enabled-${accountKey(account)}`"
              @update:model-value="toggleAccountSelection(accountKey(account))"
            />
          </div>

          <div class="border-t-2 border-gray-50">
            <button
              class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group focus:outline-none"
              type="button"
              @click="showDisabledAccounts = !showDisabledAccounts"
            >
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-widest text-black">Disabled Accounts</span>
                <span class="text-[10px] font-black text-black">{{ disabledAccountsForEditing.length }}</span>
              </div>
              <ChevronDown v-if="showDisabledAccounts" class="w-4 h-4 text-black group-hover:text-black transition-colors" />
              <ChevronRight v-else class="w-4 h-4 text-black group-hover:text-black transition-colors" />
            </button>
          </div>

          <div v-if="showDisabledAccounts">
            <div v-for="account in disabledAccountsForEditing" :key="accountKey(account)" class="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
              <div class="flex flex-col min-w-0 pr-4">
                <span class="text-base font-black text-gray-900 tracking-tight truncate">{{ accountDisplayName(account) }}</span>
                <span class="text-[10px] font-black text-black uppercase tracking-widest mt-0.5">Mask: {{ account.mask }}</span>
              </div>
              <Switch
                :model-value="false"
                :id="`group-disabled-${accountKey(account)}`"
                @update:model-value="toggleAccountSelection(accountKey(account))"
              />
            </div>
          </div>
        </div>
        <div class="px-6 py-8 border-t-2 border-gray-50 flex items-center gap-3">
          <button
            @click="closeEditAccountsModal"
            class="flex-grow px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveEditAccounts"
            class="flex-grow px-6 py-4 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
            type="button"
          >
            Save
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showAddToGroupModal"
      :is-open="showAddToGroupModal"
      size="md"
      title="Add to Group"
      @close="closeAddToGroupModal"
    >
      <template #content>
        <div class="py-2">
          <div v-if="alreadyInGroupsCount > 0" class="px-6 py-4 border-b-2 border-gray-50">
            <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Already in {{ alreadyInGroupsCount }} group{{ alreadyInGroupsCount > 1 ? 's' : '' }}
            </p>
          </div>

          <div v-if="groupsAvailableForAccount.length" class="border-b-2 border-gray-50">
            <button
              v-for="groupOption in groupsAvailableForAccount"
              :key="groupOption.group._id"
              class="w-full px-6 py-4 text-left hover:bg-gray-50/50 transition-colors"
              :class="[
                selectedTargetGroupId === groupOption.group._id ? 'bg-gray-50' : '',
                groupOption.alreadyInGroup ? 'opacity-60 cursor-not-allowed hover:bg-white' : ''
              ]"
              type="button"
              @click="selectTargetGroup(groupOption)"
            >
              <div class="flex items-center justify-between">
                <span class="text-base font-black text-gray-900 uppercase tracking-tight">{{ groupOption.group.name }}</span>
                <span
                  v-if="groupOption.alreadyInGroup"
                  class="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >
                  Already In Group
                </span>
                <Check
                  v-else-if="selectedTargetGroupId === groupOption.group._id"
                  class="w-4 h-4 text-black"
                />
              </div>
            </button>
          </div>
          <div v-else class="px-6 py-8 text-center text-[10px] font-black uppercase tracking-widest text-black">
            No existing groups
          </div>

          <div class="px-6 py-6">
            <button
              class="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
              type="button"
              @click="openCreateGroupFromAccountModal"
            >
              Create New Group
            </button>
          </div>
        </div>

        <div class="px-6 py-8 border-t-2 border-gray-50 flex items-center gap-3">
          <button
            @click="closeAddToGroupModal"
            class="flex-grow px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveAddToGroup"
            class="flex-grow px-6 py-4 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-40"
            :disabled="!selectedTargetGroupId || !targetAccountForAction"
            type="button"
          >
            Save
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showCreateGroupFromAccountModal"
      :is-open="showCreateGroupFromAccountModal"
      size="md"
      @close="closeCreateGroupFromAccountModal"
    >
      <template #header>
        <div class="px-6 py-6 border-b-2 border-gray-50 flex items-center justify-between">
          <h2 class="text-[10px] font-black uppercase tracking-widest text-black">Create New Group</h2>
          <button
            @click="closeCreateGroupFromAccountModal"
            class="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-black focus:outline-none"
            type="button"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </template>
      <template #content>
        <div class="px-6 py-8 border-b-2 border-gray-50">
          <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
            Group Name
          </label>
          <input
            v-model="newGroupInput"
            type="text"
            class="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-base font-black tracking-tight placeholder:text-gray-200 focus:outline-none focus:border-black transition-all"
            placeholder="New group name"
          />
        </div>

        <div class="py-2">
          <div v-for="account in newGroupEnabledAccounts" :key="accountKey(account)" class="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div class="flex flex-col min-w-0 pr-4">
              <span class="text-base font-black text-gray-900 tracking-tight truncate">{{ accountDisplayName(account) }}</span>
              <span class="text-[10px] font-black text-black uppercase tracking-widest mt-0.5">Mask: {{ account.mask }}</span>
            </div>
            <Switch
              :model-value="true"
              :id="`new-group-enabled-${accountKey(account)}`"
              @update:model-value="toggleNewGroupAccountSelection(accountKey(account))"
            />
          </div>

          <div class="border-t-2 border-gray-50">
            <button
              class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group focus:outline-none"
              type="button"
              @click="showNewGroupDisabledAccounts = !showNewGroupDisabledAccounts"
            >
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-widest text-black">Disabled Accounts</span>
                <span class="text-[10px] font-black text-black">{{ newGroupDisabledAccounts.length }}</span>
              </div>
              <ChevronDown v-if="showNewGroupDisabledAccounts" class="w-4 h-4 text-black group-hover:text-black transition-colors" />
              <ChevronRight v-else class="w-4 h-4 text-black group-hover:text-black transition-colors" />
            </button>
          </div>

          <div v-if="showNewGroupDisabledAccounts">
            <div v-for="account in newGroupDisabledAccounts" :key="accountKey(account)" class="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
              <div class="flex flex-col min-w-0 pr-4">
                <span class="text-base font-black text-gray-900 tracking-tight truncate">{{ accountDisplayName(account) }}</span>
                <span class="text-[10px] font-black text-black uppercase tracking-widest mt-0.5">Mask: {{ account.mask }}</span>
              </div>
              <Switch
                :model-value="false"
                :id="`new-group-disabled-${accountKey(account)}`"
                @update:model-value="toggleNewGroupAccountSelection(accountKey(account))"
              />
            </div>
          </div>
        </div>

        <div class="px-6 py-8 border-t-2 border-gray-50 flex items-center gap-3">
          <button
            @click="closeCreateGroupFromAccountModal"
            class="flex-grow px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveCreateGroupFromAccount"
            class="flex-grow px-6 py-4 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-40"
            :disabled="!canSaveNewGroup"
            type="button"
          >
            Save
          </button>
        </div>

        <p v-if="newGroupSelectedAccountIds.length < 2" class="px-6 pb-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
          Select at least 2 accounts to create a group
        </p>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '../composables/useSelectGroup.js';
import { useGroupsAPI } from '../composables/useGroupsAPI.js';
import { useDraggable } from '@/shared/composables/useDraggable';

import GroupRow from '../components/GroupRow.vue';
import NetBalance from '../components/NetBalance.vue';
import DashboardGroupSelector from '../components/DashboardGroupSelector.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import Switch from '@/shared/components/Switch.vue';
import {
  PlusCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Building,
  GripVertical,
  X,
  Check
} from 'lucide-vue-next';

import EditGroupModal from '../components/EditGroupModal.vue';
import BanksModal from '@/features/banks/components/BanksModal.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true
  },
  variant: {
    type: String,
    default: 'modal',
    validator: (value) => ['modal', 'dashboard'].includes(value)
  },
  editMode: {
    type: Boolean,
    default: false
  },
  rearrangeActive: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'group-selected']);

const router = useRouter();
const { state } = useDashboardState();
const groupsAPI = useGroupsAPI();
const editingGroup = ref(null);
const { Draggable, dragOptions } = useDraggable();
const { createNewGroup, selectGroup, fetchGroupsAndAccounts, handleGroupChange } = useSelectGroup();

const showCustomGroups = ref(true);
const showBankAccounts = ref(true);
const dashboardEditMode = ref(false);
const isDashboardVariant = computed(() => props.variant === 'dashboard');
const containerClasses = computed(() => {
  if (isDashboardVariant.value) {
    return 'w-full';
  }

  return 'theme-bg max-h-[80vh] overflow-y-auto w-full';
});
const dashboardGroups = computed(() => {
  return [...state.allUserGroups].sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
});

const toggleDashboardReorder = () => {
  dashboardEditMode.value = !dashboardEditMode.value;
};

const customGroups = ref([]);
const bankAccounts = ref([]);

const setGroupsAndAccounts = () => {
  customGroups.value = state.allUserGroups.filter(group => group.accounts.length > 1);
  bankAccounts.value = state.allUserGroups.filter(group => group.accounts.length < 2);
};

const toggleCustomGroups = () => {
  showCustomGroups.value = !showCustomGroups.value;
};

const toggleBankAccounts = () => {
  showBankAccounts.value = !showBankAccounts.value;
};

const updateGroupSorting = () => {
  if (!props.editMode) return;

  const allGroups = [...customGroups.value, ...bankAccounts.value];
  allGroups.forEach((group, index) => {
    group.sort = index;
  });
};

const updateDashboardGroupSorting = () => {
  if (!dashboardEditMode.value) return;

  state.allUserGroups.forEach((group, index) => {
    group.sort = index;
  });
};

const showEditGroupModal = ref(false);
const openEditGroupModal = (group) => {
  editingGroup.value = group;
  showEditGroupModal.value = true;
};

const closeEditGroupModal = () => {
  setGroupsAndAccounts();
  showEditGroupModal.value = false;
  editingGroup.value = null;
};

const showBanksModal = ref(false);

const actionTarget = ref(null);
const currentRowAction = ref('');

const showRenameModal = ref(false);
const showDuplicateModal = ref(false);
const showDeleteModal = ref(false);
const showEditAccountsModal = ref(false);
const showAddToGroupModal = ref(false);
const showCreateGroupFromAccountModal = ref(false);

const renameInput = ref('');
const duplicateInput = ref('');
const deleteInput = ref('');
const selectedAccountIds = ref([]);
const showDisabledAccounts = ref(false);
const selectedTargetGroupId = ref('');
const newGroupInput = ref('');
const newGroupSelectedAccountIds = ref([]);
const showNewGroupDisabledAccounts = ref(false);

const renameModalTitle = computed(() => {
  if (currentRowAction.value === 'rename-account') {
    return 'Rename Account';
  }

  return 'Rename Group';
});

const renamePlaceholder = computed(() => {
  if (currentRowAction.value === 'rename-account') {
    return 'Account name';
  }

  return 'Group name';
});

const actionTargetName = computed(() => actionTarget.value?.name || '');

const targetAccountForAction = computed(() => {
  const targetAccount = actionTarget.value?.accounts?.[0];
  return resolveAccount(targetAccount);
});

const groupsAvailableForAccount = computed(() => {
  const targetAccount = targetAccountForAction.value;
  const baseGroups = state.allUserGroups
    .filter((group) => Array.isArray(group.accounts) && group.accounts.length > 1)
    .filter((group) => group._id !== actionTarget.value?._id)
    .sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));

  return baseGroups.map((group) => {
    const alreadyInGroup = Boolean(
      targetAccount && (group.accounts || []).some((groupAccount) => accountsMatch(groupAccount, targetAccount))
    );

    return { group, alreadyInGroup };
  });
});

const alreadyInGroupsCount = computed(() => {
  return groupsAvailableForAccount.value.filter(groupOption => groupOption.alreadyInGroup).length;
});

const newGroupEnabledAccounts = computed(() => {
  const selectedIds = new Set(newGroupSelectedAccountIds.value);
  return state.allUserAccounts.filter(account => selectedIds.has(accountKey(account)));
});

const newGroupDisabledAccounts = computed(() => {
  const selectedIds = new Set(newGroupSelectedAccountIds.value);
  return state.allUserAccounts.filter(account => !selectedIds.has(accountKey(account)));
});

const canSaveNewGroup = computed(() => {
  return newGroupInput.value.trim().length > 0 && newGroupSelectedAccountIds.value.length >= 2;
});

const enabledAccountsForEditing = computed(() => {
  const selectedIds = new Set(selectedAccountIds.value);
  return state.allUserAccounts.filter(account => selectedIds.has(accountKey(account)));
});

const disabledAccountsForEditing = computed(() => {
  const selectedIds = new Set(selectedAccountIds.value);
  return state.allUserAccounts.filter(account => !selectedIds.has(accountKey(account)));
});

function accountKey(account) {
  if (typeof account === 'string') {
    return account;
  }

  return account?.account_id || account?._id || '';
}

function accountIdentifiers(account) {
  if (!account) return [];

  if (typeof account === 'string') {
    return [account];
  }

  return [account?._id, account?.account_id].filter(Boolean);
}

function accountsMatch(accountA, accountB) {
  const idsA = accountIdentifiers(accountA);
  const idsB = new Set(accountIdentifiers(accountB));
  return idsA.some((id) => idsB.has(id));
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function resolveAccount(account) {
  if (!account) return null;

  const lookupIds = accountIdentifiers(account);
  if (!lookupIds.length) {
    return null;
  }

  return (
    state.allUserAccounts.find((userAccount) =>
      accountIdentifiers(userAccount).some((id) => lookupIds.includes(id))
    ) || (typeof account === 'object' ? account : null)
  );
}

function isRawAccountRow(group) {
  const groupAccounts = Array.isArray(group?.accounts) ? group.accounts : [];
  if (groupAccounts.length !== 1) {
    return false;
  }

  const rawAccount = groupAccounts[0];
  const resolvedAccount = resolveAccount(rawAccount) || rawAccount;
  const defaultNames = new Set(
    [
      rawAccount?.mask,
      resolvedAccount?.mask,
      resolvedAccount?.name,
      resolvedAccount?.official_name,
      resolvedAccount?.officialName
    ].filter(Boolean)
  );

  return defaultNames.has(group?.name);
}

function accountDisplayName(account) {
  return account?.official_name || account?.officialName || account?.name || 'Account';
}

function serializeAccounts(accounts) {
  return accounts
    .map((account) => resolveAccount(account))
    .filter(Boolean)
    .map((account) => ({
      _id: account._id,
      account_id: account.account_id,
      mask: account.mask,
      current: numberOrZero(account.current ?? account.balances?.current),
      available: numberOrZero(account.available ?? account.balances?.available)
    }));
}

function totalsForAccounts(accounts) {
  return accounts.reduce((totals, account) => {
    totals.totalCurrentBalance += numberOrZero(account.current);
    totals.totalAvailableBalance += numberOrZero(account.available);
    return totals;
  }, { totalCurrentBalance: 0, totalAvailableBalance: 0 });
}

function buildGroupUpdatePayload(name, info, accounts) {
  const serializedAccounts = serializeAccounts(accounts);
  const totals = totalsForAccounts(serializedAccounts);

  return {
    name,
    info: info || '',
    accounts: serializedAccounts,
    totalCurrentBalance: totals.totalCurrentBalance,
    totalAvailableBalance: totals.totalAvailableBalance
  };
}

function resetActionTarget() {
  actionTarget.value = null;
  currentRowAction.value = '';
}

function closeRenameModal() {
  showRenameModal.value = false;
  renameInput.value = '';
  resetActionTarget();
}

function closeDuplicateModal() {
  showDuplicateModal.value = false;
  duplicateInput.value = '';
  resetActionTarget();
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  deleteInput.value = '';
  resetActionTarget();
}

function closeEditAccountsModal() {
  showEditAccountsModal.value = false;
  selectedAccountIds.value = [];
  showDisabledAccounts.value = false;
  resetActionTarget();
}

function closeAddToGroupModal() {
  showAddToGroupModal.value = false;
  selectedTargetGroupId.value = '';
  resetActionTarget();
}

function closeCreateGroupFromAccountModal() {
  showCreateGroupFromAccountModal.value = false;
  newGroupInput.value = '';
  newGroupSelectedAccountIds.value = [];
  showNewGroupDisabledAccounts.value = false;
}

function handleRowAction(payload) {
  if (!payload?.action || !payload?.group) {
    return;
  }

  actionTarget.value = payload.group;
  currentRowAction.value = payload.action;

  if (payload.action === 'rename-group' || payload.action === 'rename-account') {
    renameInput.value = payload.group.name || '';
    showRenameModal.value = true;
    return;
  }

  if (payload.action === 'duplicate-group') {
    duplicateInput.value = `copy of ${payload.group.name || 'group'}`;
    showDuplicateModal.value = true;
    return;
  }

  if (payload.action === 'remove-group') {
    deleteInput.value = '';
    showDeleteModal.value = true;
    return;
  }

  if (payload.action === 'edit-accounts') {
    const currentAccountIds = (payload.group.accounts || [])
      .map((account) => accountKey(resolveAccount(account) || account))
      .filter(Boolean);
    selectedAccountIds.value = currentAccountIds;
    showDisabledAccounts.value = false;
    showEditAccountsModal.value = true;
    return;
  }

  if (payload.action === 'add-to-group') {
    selectedTargetGroupId.value = '';
    showAddToGroupModal.value = true;
  }
}

function selectTargetGroup(groupOption) {
  if (groupOption?.alreadyInGroup) {
    return;
  }

  selectedTargetGroupId.value = groupOption?.group?._id || '';
}

function toggleAccountSelection(accountId) {
  if (!accountId) return;

  if (selectedAccountIds.value.includes(accountId)) {
    selectedAccountIds.value = selectedAccountIds.value.filter(id => id !== accountId);
    return;
  }

  selectedAccountIds.value = [...selectedAccountIds.value, accountId];
}

function toggleNewGroupAccountSelection(accountId) {
  if (!accountId) return;

  if (newGroupSelectedAccountIds.value.includes(accountId)) {
    newGroupSelectedAccountIds.value = newGroupSelectedAccountIds.value.filter(id => id !== accountId);
    return;
  }

  newGroupSelectedAccountIds.value = [...newGroupSelectedAccountIds.value, accountId];
}

async function saveRename() {
  const target = actionTarget.value;
  const nextName = renameInput.value.trim();
  if (!target?._id || !nextName) return;

  await groupsAPI.updateGroup(target._id, { name: nextName });
  target.name = nextName;
  setGroupsAndAccounts();
  closeRenameModal();
}

async function saveDuplicate() {
  const sourceGroup = actionTarget.value;
  const nextName = duplicateInput.value.trim();
  if (!sourceGroup?._id || !nextName) return;

  const nextSort = state.allUserGroups.reduce(
    (maxSort, group) => Math.max(maxSort, numberOrZero(group.sort)),
    -1
  ) + 1;

  const newGroupPayload = buildGroupUpdatePayload(
    nextName,
    sourceGroup.info,
    sourceGroup.accounts || []
  );

  const createdGroup = await groupsAPI.createGroup({
    ...newGroupPayload,
    isLabel: typeof sourceGroup.isLabel === 'boolean' ? sourceGroup.isLabel : (sourceGroup.accounts || []).length > 1,
    isSelected: false,
    sort: nextSort
  });

  if (createdGroup) {
    if (typeof createdGroup.isLabel !== 'boolean') {
      createdGroup.isLabel = typeof sourceGroup.isLabel === 'boolean' ? sourceGroup.isLabel : (sourceGroup.accounts || []).length > 1;
    }
    state.allUserGroups.push(createdGroup);
    state.allUserGroups.sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
  }

  setGroupsAndAccounts();
  closeDuplicateModal();
}

async function saveDelete() {
  const target = actionTarget.value;
  if (!target?._id) return;

  const isDeleteConfirmed = deleteInput.value.trim().toLowerCase() === 'delete';
  if (!isDeleteConfirmed) return;

  const removedSelectedGroup = state.selected.group?._id === target._id || target.isSelected;
  await groupsAPI.deleteGroup(target._id);

  state.allUserGroups = state.allUserGroups.filter(group => group._id !== target._id);
  setGroupsAndAccounts();
  closeDeleteModal();

  if (removedSelectedGroup && state.allUserGroups.length) {
    await selectGroup(state.allUserGroups[0]);
  }
}

async function saveEditAccounts() {
  const target = actionTarget.value;
  if (!target?._id) return;

  const selectedIds = new Set(selectedAccountIds.value);
  const selectedAccounts = state.allUserAccounts.filter(account => selectedIds.has(accountKey(account)));
  const payload = buildGroupUpdatePayload(target.name, target.info, selectedAccounts);

  await groupsAPI.updateGroup(target._id, payload);
  target.accounts = payload.accounts;
  target.totalCurrentBalance = payload.totalCurrentBalance;
  target.totalAvailableBalance = payload.totalAvailableBalance;

  setGroupsAndAccounts();
  closeEditAccountsModal();

  if (state.selected.group?._id === target._id) {
    await handleGroupChange({ forceRefresh: true, preserveSelectedTab: true });
  }
}

async function saveAddToGroup() {
  const targetGroup = state.allUserGroups.find(group => group._id === selectedTargetGroupId.value);
  const account = targetAccountForAction.value;

  if (!targetGroup?._id || !account) return;

  const currentAccounts = [...(targetGroup.accounts || [])];
  const alreadyIncluded = currentAccounts.some(groupAccount => accountsMatch(groupAccount, account));
  const nextAccounts = alreadyIncluded ? currentAccounts : [...currentAccounts, account];
  const payload = buildGroupUpdatePayload(targetGroup.name, targetGroup.info, nextAccounts);

  await groupsAPI.updateGroup(targetGroup._id, payload);
  targetGroup.accounts = payload.accounts;
  targetGroup.totalCurrentBalance = payload.totalCurrentBalance;
  targetGroup.totalAvailableBalance = payload.totalAvailableBalance;

  setGroupsAndAccounts();
  closeAddToGroupModal();

  if (state.selected.group?._id === targetGroup._id) {
    await handleGroupChange({ forceRefresh: true, preserveSelectedTab: true });
  }
}

function openCreateGroupFromAccountModal() {
  showCreateGroupFromAccountModal.value = true;
  const accountName = targetAccountForAction.value?.name || 'Group';
  newGroupInput.value = `New ${accountName}`;
  const targetAccountId = accountKey(targetAccountForAction.value);
  newGroupSelectedAccountIds.value = targetAccountId ? [targetAccountId] : [];
  showNewGroupDisabledAccounts.value = true;
}

async function saveCreateGroupFromAccount() {
  const groupName = newGroupInput.value.trim();
  if (!canSaveNewGroup.value) return;

  const nextSort = state.allUserGroups.reduce(
    (maxSort, group) => Math.max(maxSort, numberOrZero(group.sort)),
    -1
  ) + 1;

  const selectedIds = new Set(newGroupSelectedAccountIds.value);
  const selectedAccounts = state.allUserAccounts.filter(account => selectedIds.has(accountKey(account)));
  const payload = buildGroupUpdatePayload(groupName, '', selectedAccounts);
  const createdGroup = await groupsAPI.createGroup({
    ...payload,
    isLabel: true,
    isSelected: false,
    sort: nextSort
  });

  if (createdGroup) {
    if (typeof createdGroup.isLabel !== 'boolean') {
      createdGroup.isLabel = true;
    }
    state.allUserGroups.push(createdGroup);
    state.allUserGroups.sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
  }

  setGroupsAndAccounts();
  closeCreateGroupFromAccountModal();
  closeAddToGroupModal();
}

const goToOnboarding = () => {
  emit('close');
  state.isOnboarding = true;
};

const handleDeleteGroup = () => {
  setGroupsAndAccounts();
  closeEditGroupModal();
};

const handleCreateNewGroup = async () => {
  if (!props.editMode) return;

  const newGroup = await createNewGroup();
  setGroupsAndAccounts();
  openEditGroupModal(newGroup);
};

const handleSelectGroup = (group) => {
  if (props.editMode) return;

  emit('group-selected', group);
  emit('close');
  selectGroup(group).catch((error) => {
    console.error('Error selecting group:', error);
  });
};

const handleManageBanks = async () => {
  showBanksModal.value = true;
};

const handleBankConnected = () => {
  showBanksModal.value = false;
};

const handleBanksDataChanged = async () => {
  try {
    const { groups, accounts, itemsNeedingReauth } = await fetchGroupsAndAccounts();

    state.itemsNeedingReauth = itemsNeedingReauth || [];
    state.allUserGroups = (groups || []).sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
    state.allUserAccounts = accounts || [];
    setGroupsAndAccounts();

    if (!state.allUserGroups.length || !state.allUserAccounts.length) {
      showBanksModal.value = false;
      emit('close');
      state.isOnboarding = true;
      return;
    }

    const selectedGroupId = state.selected.group?._id;
    const selectedStillExists = Boolean(
      selectedGroupId && state.allUserGroups.some(group => group._id === selectedGroupId)
    );

    if (!selectedStillExists) {
      await selectGroup(state.allUserGroups[0]);
      return;
    }

    await handleGroupChange();
  } catch (error) {
    console.error('Error refreshing groups and accounts after bank data change:', error);
  }
};

onMounted(() => {
  setGroupsAndAccounts();
});
</script>

<style scoped>
.theme-bg {
  background-color: var(--theme-bg);
  color: var(--theme-text);
}

.theme-bg-element {
  background-color: var(--theme-bg);
}

.theme-btn-primary {
  background-color: var(--theme-btn-primary-bg);
  color: var(--theme-btn-primary-text);
}

.theme-text-placeholder::placeholder {
  color: var(--theme-text-soft);
  opacity: 0.5;
}

.bg-soft {
  background-color: var(--theme-bg-soft);
}

.theme-text {
  color: var(--theme-text);
}

.theme-text-muted {
  color: var(--theme-text-soft);
}

.theme-border {
  border-color: var(--theme-border);
}

.edit-mode-container {
  background-color: var(--theme-edit-container-bg);
}
</style> 
