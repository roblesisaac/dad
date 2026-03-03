<template>
  <div class="dashboard-group-selector" @click="closeAllMenus">
    <section class="pb-4 border-b selector-divider">
      <div class="flex items-center gap-2 overflow-x-auto pb-1 hide-scroll">
        <div
          v-for="label in sortedLabelGroups"
          :key="label._id"
          :class="['relative flex-shrink-0', { 'menu-open': activeLabelMenuId === label._id }]"
          data-menu-surface
        >
          <button
            type="button"
            class="label-chip flex items-center gap-2"
            :class="{ 'label-chip-active': state.selected.group?._id === label._id }"
            @click.stop="handleLabelChipSelect(label)"
          >
            <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ label.name }}</span>
            <span class="text-[10px] font-black label-chip-count">{{ label.accounts?.length || 0 }}</span>
          </button>

          <button
            type="button"
            class="chip-menu-trigger"
            data-menu-surface
            @click.stop="toggleLabelMenu(label._id, $event)"
          >
            <EllipsisVertical class="w-3.5 h-3.5" />
          </button>
        </div>

        <div v-if="!sortedLabelGroups.length" class="text-[10px] font-black uppercase tracking-[0.2em] selector-muted px-1 py-2">
          No labels yet
        </div>
      </div>
    </section>

    <div
      v-if="activeLabelGroup"
      class="selector-menu selector-menu-fixed"
      :style="labelMenuStyles"
      data-menu-surface
    >
      <button type="button" class="selector-menu-item" @click.stop="openRenameLabel(activeLabelGroup)">
        Rename
      </button>
      <button type="button" class="selector-menu-item" @click.stop="openDeleteLabel(activeLabelGroup)">
        Remove
      </button>
    </div>

    <section class="w-full">
      <Draggable
        v-if="dashboardEditMode"
        v-model="dashboardAccounts"
        v-bind="dragOptions"
        handle=".handler-account"
        item-key="account_id"
        @end="handleAccountReorderEnd"
      >
        <template #item="{ element }">
          <div :key="accountKey(element)" class="selector-row group">
            <button
              type="button"
              class="w-full text-left py-6"
              disabled
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-3 min-w-0 flex-1">
                  <GripVertical class="handler-account w-4 h-4 mt-1 selector-muted cursor-grab" />
                  <div class="min-w-0 flex-1">
                    <div class="text-base font-black uppercase tracking-tight truncate selector-text">
                      {{ accountDisplayLabel(element) }}
                    </div>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <span
                        v-for="label in labelsForAccount(element)"
                        :key="`pill-edit-${accountKey(element)}-${label._id}`"
                        class="label-pill"
                      >
                        {{ label.name }}
                      </span>
                    </div>
                  </div>
                </div>
                <span class="text-base font-black tracking-tight selector-text">
                  {{ formatPrice(accountNetBalance(element), { toFixed: 0 }) }}
                </span>
              </div>
            </button>
          </div>
        </template>
      </Draggable>

      <div v-else>
        <div
          v-for="account in sortedAccounts"
          :key="accountKey(account)"
          :class="['selector-row group', { 'row-menu-open': accountRowHasOpenMenu(account) }]"
        >
          <div
            class="w-full text-left py-6 row-main"
            role="button"
            tabindex="0"
            @click="handleAccountRowSelect(account)"
            @keydown.enter.prevent="handleAccountRowSelect(account)"
            @keydown.space.prevent="handleAccountRowSelect(account)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="text-base font-black uppercase tracking-tight truncate selector-text">
                    {{ accountDisplayLabel(account) }}
                  </div>

                  <div class="row-title-actions flex-shrink-0">
                    <div class="relative row-menu-anchor-inline" data-menu-surface>
                      <button
                        type="button"
                        class="row-menu-trigger"
                        data-menu-surface
                        @click.stop="toggleAccountMenu(account)"
                      >
                        <EllipsisVertical class="w-4 h-4" />
                      </button>

                      <div
                        v-if="activeAccountMenuId === accountKey(account)"
                        class="selector-menu left-0 mt-2"
                        data-menu-surface
                      >
                        <button type="button" class="selector-menu-item" @click.stop="openAddLabelModal(account)">
                          Add Label
                        </button>
                        <button type="button" class="selector-menu-item" @click.stop="openRenameAccount(account)">
                          Rename Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="labelsForAccount(account).length" class="mt-2 flex flex-wrap gap-2">
                  <div
                    v-for="label in labelsForAccount(account)"
                    :key="`pill-${accountKey(account)}-${label._id}`"
                    class="relative"
                    data-menu-surface
                  >
                    <div class="label-pill label-pill-clickable" data-menu-surface>
                      <button
                        type="button"
                        class="label-pill-button"
                        data-menu-surface
                        @click.stop="handleLabelChipSelect(label)"
                      >
                        {{ label.name }}
                      </button>
                      <button
                        type="button"
                        class="label-pill-menu"
                        data-menu-surface
                        @click.stop="toggleAccountLabelMenu(account, label)"
                      >
                        <EllipsisVertical class="w-3 h-3" />
                      </button>
                    </div>

                    <div
                      v-if="isAccountLabelMenuOpen(account, label)"
                      class="selector-menu left-0 mt-2"
                      data-menu-surface
                    >
                      <button
                        type="button"
                        class="selector-menu-item"
                        @click.stop="removeLabelFromAccount(account, label)"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        class="selector-menu-item"
                        @click.stop="openRenameLabel(label)"
                      >
                        Rename
                      </button>
                    </div>
                  </div>
                </div>

                <div v-else class="mt-2 text-[10px] font-black uppercase tracking-[0.2em] selector-muted">
                  No labels
                </div>
              </div>

              <span class="text-base font-black tracking-tight shrink-0 selector-text">
                {{ formatPrice(accountNetBalance(account), { toFixed: 0 }) }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="!sortedAccounts.length" class="py-12 text-center text-[10px] font-black uppercase tracking-[0.2em] selector-muted">
          No accounts
        </div>
      </div>
    </section>

    <div class="selector-divider">
      <button
        @click="goToOnboarding"
        class="utility-row"
        type="button"
      >
        <span class="text-base font-black uppercase tracking-tight selector-text">Re-Sync All</span>
        <RefreshCw class="w-4 h-4 selector-muted" />
      </button>

      <button
        @click="showBanksModal = true"
        class="utility-row"
        type="button"
      >
        <span class="text-base font-black uppercase tracking-tight selector-text">Manage Banks</span>
        <Building class="w-4 h-4 selector-muted" />
      </button>

      <button
        class="utility-row"
        type="button"
        @click="toggleDashboardReorder"
      >
        <span class="text-base font-black uppercase tracking-tight selector-text">
          {{ dashboardEditMode ? 'Done Rearranging' : 'Rearrange Accounts' }}
        </span>
        <GripVertical class="w-4 h-4 selector-muted" />
      </button>
    </div>

    <BaseModal
      v-if="showRenameModal"
      :is-open="showRenameModal"
      size="md"
      @close="closeRenameModal"
    >
      <template #header>
        <div class="modal-header">
          <h2 class="modal-title">{{ renameModalTitle }}</h2>
          <button
            @click="closeRenameModal"
            class="modal-close"
            type="button"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </template>

      <template #content>
        <div class="px-6 py-8">
          <label class="modal-label">Name</label>
          <input
            v-model="renameInput"
            type="text"
            class="modal-input"
          />
        </div>
        <div class="modal-footer">
          <button
            @click="closeRenameModal"
            class="modal-button-secondary"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveRename"
            class="modal-button-primary"
            type="button"
            :disabled="!renameInput.trim()"
          >
            Save
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showDeleteLabelModal"
      :is-open="showDeleteLabelModal"
      size="md"
      @close="closeDeleteLabelModal"
    >
      <template #header>
        <div class="modal-header">
          <h2 class="modal-title">Remove Label</h2>
          <button
            @click="closeDeleteLabelModal"
            class="modal-close"
            type="button"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </template>

      <template #content>
        <div class="px-6 py-8 space-y-4">
          <p class="text-sm font-black tracking-tight selector-text">
            Type <span class="uppercase">delete</span> to remove "{{ deleteLabelTarget?.name }}".
          </p>
          <input
            v-model="deleteLabelInput"
            type="text"
            class="modal-input"
            placeholder="delete"
          />
        </div>
        <div class="modal-footer">
          <button
            @click="closeDeleteLabelModal"
            class="modal-button-secondary"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveDeleteLabel"
            class="modal-button-danger"
            :disabled="deleteLabelInput.trim().toLowerCase() !== 'delete'"
            type="button"
          >
            Remove Label
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showAddLabelModal"
      :is-open="showAddLabelModal"
      title="Add Label"
      size="md"
      @close="closeAddLabelModal"
    >
      <template #content>
        <div class="py-2">
          <div v-if="sortedLabelGroups.length" class="border-b selector-divider">
            <button
              v-for="label in sortedLabelGroups"
              :key="`add-label-${label._id}`"
              type="button"
              class="w-full px-6 py-4 text-left label-option"
              @click="toggleAddLabelSelection(label._id)"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-base font-black uppercase tracking-tight selector-text">{{ label.name }}</span>
                <Check
                  v-if="selectedLabelIds.includes(label._id)"
                  class="w-4 h-4 selector-text"
                />
              </div>
            </button>
          </div>

          <div v-else class="px-6 py-8 text-center text-[10px] font-black uppercase tracking-[0.2em] selector-muted">
            No existing labels
          </div>

          <div class="px-6 py-6">
            <button
              class="modal-button-secondary w-full"
              type="button"
              @click="openCreateLabelModal"
            >
              Create New Label
            </button>
          </div>
        </div>

        <div class="modal-footer">
          <button
            @click="closeAddLabelModal"
            class="modal-button-secondary"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveAddLabel"
            class="modal-button-primary"
            :disabled="!canSaveAddLabel"
            type="button"
          >
            Save
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showCreateLabelModal"
      :is-open="showCreateLabelModal"
      size="md"
      @close="closeCreateLabelModal"
    >
      <template #header>
        <div class="modal-header">
          <h2 class="modal-title">Create New Label</h2>
          <button
            @click="closeCreateLabelModal"
            class="modal-close"
            type="button"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </template>

      <template #content>
        <div class="px-6 py-8">
          <label class="modal-label">Label Name</label>
          <input
            v-model="newLabelInput"
            type="text"
            class="modal-input"
            placeholder="Label name"
          />
        </div>

        <div class="modal-footer">
          <button
            @click="closeCreateLabelModal"
            class="modal-button-secondary"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveCreateLabel"
            class="modal-button-primary"
            :disabled="!canSaveNewLabel"
            type="button"
          >
            Save
          </button>
        </div>
      </template>
    </BaseModal>

    <BanksModal
      v-if="showBanksModal"
      :is-open="showBanksModal"
      @close="showBanksModal = false"
      @connect-bank-complete="handleBankConnected"
      @banks-data-changed="handleBanksDataChanged"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Check, Building, EllipsisVertical, GripVertical, RefreshCw, X } from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '@/features/select-group/composables/useSelectGroup';
import { useGroupsAPI } from '@/features/select-group/composables/useGroupsAPI';
import { useBanks } from '@/features/banks/composables/useBanks';
import { useUtils } from '@/shared/composables/useUtils';
import { useDraggable } from '@/shared/composables/useDraggable';
import BaseModal from '@/shared/components/BaseModal.vue';
import BanksModal from '@/features/banks/components/BanksModal.vue';

const emit = defineEmits(['group-selected']);

const router = useRouter();
const { state } = useDashboardState();
const groupsAPI = useGroupsAPI();
const { formatPrice } = useUtils();
const { Draggable, dragOptions } = useDraggable();
const {
  labelGroups,
  selectGroup,
  getAccountContextGroup,
  fetchGroupsAndAccounts,
  handleGroupChange
} = useSelectGroup();
const { fetchBanks } = useBanks();

const dashboardEditMode = ref(false);
const dashboardAccounts = ref([]);

const activeAccountMenuId = ref('');
const activeLabelMenuId = ref('');
const activeAccountLabelMenuKey = ref('');
const activeLabelMenuPosition = ref({ top: 0, left: 0 });

const showRenameModal = ref(false);
const renameInput = ref('');
const renameType = ref('label');
const renameTargetGroup = ref(null);

const showDeleteLabelModal = ref(false);
const deleteLabelTarget = ref(null);
const deleteLabelInput = ref('');

const showAddLabelModal = ref(false);
const addLabelTargetAccount = ref(null);
const selectedLabelIds = ref([]);

const showCreateLabelModal = ref(false);
const newLabelInput = ref('');

const showBanksModal = ref(false);

const sortedLabelGroups = computed(() => {
  return [...labelGroups.value].sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
});

const activeLabelGroup = computed(() => {
  if (!activeLabelMenuId.value) {
    return null;
  }

  return sortedLabelGroups.value.find(label => label._id === activeLabelMenuId.value) || null;
});

const labelMenuStyles = computed(() => {
  return {
    top: `${activeLabelMenuPosition.value.top}px`,
    left: `${activeLabelMenuPosition.value.left}px`
  };
});

const sortedAccounts = computed(() => {
  const rows = state.allUserAccounts.map((account, index) => {
    const contextGroup = getAccountContextGroup(account);
    const sort = Number.isFinite(Number(contextGroup?.sort))
      ? Number(contextGroup.sort)
      : Number.MAX_SAFE_INTEGER;

    return { account, index, sort };
  });

  rows.sort((a, b) => {
    if (a.sort !== b.sort) {
      return a.sort - b.sort;
    }

    return a.index - b.index;
  });

  return rows.map(({ account }) => account);
});

const renameModalTitle = computed(() => {
  return renameType.value === 'account' ? 'Rename Account' : 'Rename Label';
});

const canSaveAddLabel = computed(() => selectedLabelIds.value.length > 0);

const canSaveNewLabel = computed(() => {
  return newLabelInput.value.trim().length > 0;
});

watch(
  () => sortedAccounts.value,
  (accounts) => {
    if (!dashboardEditMode.value) {
      dashboardAccounts.value = [...accounts];
    }
  },
  { immediate: true }
);

onMounted(async () => {
  await fetchBanks();
  document.addEventListener('click', closeMenusOnOutsideClick);
  window.addEventListener('resize', closeAllMenus);
  window.addEventListener('scroll', closeAllMenus, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenusOnOutsideClick);
  window.removeEventListener('resize', closeAllMenus);
  window.removeEventListener('scroll', closeAllMenus, true);
});

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function accountKey(account) {
  if (!account) {
    return '';
  }

  if (typeof account === 'string') {
    return account;
  }

  return account._id || account.account_id || '';
}

function accountIdentifiers(account) {
  if (!account) return [];
  if (typeof account === 'string') return [account];

  return [account._id, account.account_id].filter(Boolean);
}

function accountsMatch(accountA, accountB) {
  const idsA = accountIdentifiers(accountA);
  const idsB = new Set(accountIdentifiers(accountB));
  return idsA.some(id => idsB.has(id));
}

function resolveAccount(account) {
  if (!account) return null;

  const ids = accountIdentifiers(account);
  if (!ids.length) return null;

  return state.allUserAccounts.find((userAccount) => {
    return accountIdentifiers(userAccount).some(id => ids.includes(id));
  }) || (typeof account === 'object' ? account : null);
}

function accountDisplayLabel(account) {
  const contextGroup = getAccountContextGroup(account);
  if (contextGroup?.name) {
    return contextGroup.name;
  }

  const resolved = resolveAccount(account) || account;
  return resolved?.official_name || resolved?.officialName || resolved?.name || resolved?.mask || 'Account';
}

function accountNetBalance(account) {
  const resolved = resolveAccount(account) || account;
  const accountType = resolved?.type;
  const available = numberOrZero(resolved?.balances?.available ?? resolved?.available);
  const current = numberOrZero(resolved?.balances?.current ?? resolved?.current);

  return accountType === 'credit' ? -current : available;
}

function labelsForAccount(account) {
  return sortedLabelGroups.value.filter((label) => {
    return (label.accounts || []).some(labelAccount => accountsMatch(labelAccount, account));
  });
}

function closeAllMenus() {
  activeAccountMenuId.value = '';
  activeLabelMenuId.value = '';
  activeAccountLabelMenuKey.value = '';
  activeLabelMenuPosition.value = { top: 0, left: 0 };
}

function closeMenusOnOutsideClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  if (target.closest('[data-menu-surface]')) {
    return;
  }

  closeAllMenus();
}

function toggleAccountMenu(account) {
  const nextId = activeAccountMenuId.value === accountKey(account) ? '' : accountKey(account);
  activeAccountMenuId.value = nextId;
  activeLabelMenuId.value = '';
  activeAccountLabelMenuKey.value = '';
}

function toggleLabelMenu(labelId, event) {
  if (activeLabelMenuId.value === labelId) {
    activeLabelMenuId.value = '';
    return;
  }

  activeLabelMenuId.value = labelId;
  activeAccountMenuId.value = '';
  activeAccountLabelMenuKey.value = '';

  const triggerElement = event?.currentTarget;
  if (!(triggerElement instanceof Element)) {
    return;
  }

  const triggerRect = triggerElement.getBoundingClientRect();
  const menuWidth = 176;
  const viewportPadding = 8;
  const calculatedTop = triggerRect.bottom + 8;
  const calculatedLeft = triggerRect.right - menuWidth;
  const boundedLeft = Math.max(
    viewportPadding,
    Math.min(calculatedLeft, window.innerWidth - menuWidth - viewportPadding)
  );

  activeLabelMenuPosition.value = {
    top: calculatedTop,
    left: boundedLeft
  };
}

function accountLabelMenuKey(account, label) {
  return `${accountKey(account)}::${label._id}`;
}

function toggleAccountLabelMenu(account, label) {
  const key = accountLabelMenuKey(account, label);
  activeAccountLabelMenuKey.value = activeAccountLabelMenuKey.value === key ? '' : key;
  activeAccountMenuId.value = '';
  activeLabelMenuId.value = '';
}

function isAccountLabelMenuOpen(account, label) {
  return activeAccountLabelMenuKey.value === accountLabelMenuKey(account, label);
}

function accountRowHasOpenMenu(account) {
  const key = accountKey(account);
  if (!key) {
    return false;
  }

  return activeAccountMenuId.value === key || activeAccountLabelMenuKey.value.startsWith(`${key}::`);
}

function toggleDashboardReorder() {
  dashboardEditMode.value = !dashboardEditMode.value;
  closeAllMenus();

  if (dashboardEditMode.value) {
    dashboardAccounts.value = [...sortedAccounts.value];
  } else {
    dashboardAccounts.value = [...sortedAccounts.value];
  }
}

async function handleAccountReorderEnd() {
  const updateRequests = [];

  dashboardAccounts.value.forEach((account, index) => {
    const contextGroup = getAccountContextGroup(account);
    if (!contextGroup?._id) {
      return;
    }

    if (Number(contextGroup.sort) === index) {
      return;
    }

    contextGroup.sort = index;
    updateRequests.push(groupsAPI.updateGroupSort(contextGroup._id, index));
  });

  if (!updateRequests.length) {
    return;
  }

  await Promise.allSettled(updateRequests);
  state.allUserGroups.sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
}

async function handleLabelChipSelect(labelGroup) {
  closeAllMenus();
  emit('group-selected', labelGroup);

  try {
    await selectGroup(labelGroup);
  } catch (error) {
    console.error('Error selecting label group', error);
  }
}

async function handleAccountRowSelect(account) {
  const accountContextGroup = await ensureAccountContextGroup(account);
  if (!accountContextGroup) {
    console.warn('No account-context group found for account', account);
    return;
  }

  closeAllMenus();
  emit('group-selected', accountContextGroup);

  try {
    await selectGroup(accountContextGroup);
  } catch (error) {
    console.error('Error selecting account context group', error);
  }
}

async function openRenameAccount(account) {
  const accountContextGroup = await ensureAccountContextGroup(account);
  if (!accountContextGroup?._id) {
    return;
  }

  renameType.value = 'account';
  renameTargetGroup.value = accountContextGroup;
  renameInput.value = accountContextGroup.name || '';
  showRenameModal.value = true;
  activeAccountMenuId.value = '';
}

function openRenameLabel(labelGroup) {
  renameType.value = 'label';
  renameTargetGroup.value = labelGroup;
  renameInput.value = labelGroup?.name || '';
  showRenameModal.value = true;
  closeAllMenus();
}

function closeRenameModal() {
  showRenameModal.value = false;
  renameInput.value = '';
  renameType.value = 'label';
  renameTargetGroup.value = null;
}

async function saveRename() {
  const target = renameTargetGroup.value;
  const nextName = renameInput.value.trim();
  if (!target?._id || !nextName) {
    return;
  }

  await groupsAPI.updateGroup(target._id, { name: nextName });
  target.name = nextName;
  closeRenameModal();
}

function openDeleteLabel(labelGroup) {
  deleteLabelTarget.value = labelGroup;
  deleteLabelInput.value = '';
  showDeleteLabelModal.value = true;
  closeAllMenus();
}

function closeDeleteLabelModal() {
  showDeleteLabelModal.value = false;
  deleteLabelTarget.value = null;
  deleteLabelInput.value = '';
}

async function saveDeleteLabel() {
  const target = deleteLabelTarget.value;
  if (!target?._id) {
    return;
  }

  if (deleteLabelInput.value.trim().toLowerCase() !== 'delete') {
    return;
  }

  await groupsAPI.deleteGroup(target._id);
  state.allUserGroups = state.allUserGroups.filter(group => group._id !== target._id);
  closeDeleteLabelModal();

  await refreshSelectedGroupIfNeeded([target._id]);
}

function openAddLabelModal(account) {
  addLabelTargetAccount.value = account;
  selectedLabelIds.value = [];
  showAddLabelModal.value = true;
  activeAccountMenuId.value = '';
}

function closeAddLabelModal() {
  showAddLabelModal.value = false;
  addLabelTargetAccount.value = null;
  selectedLabelIds.value = [];
}

function toggleAddLabelSelection(labelId) {
  if (!labelId) {
    return;
  }

  if (selectedLabelIds.value.includes(labelId)) {
    selectedLabelIds.value = selectedLabelIds.value.filter(id => id !== labelId);
    return;
  }

  selectedLabelIds.value = [...selectedLabelIds.value, labelId];
}

function serializeAccounts(accounts) {
  return accounts
    .map(account => resolveAccount(account))
    .filter(Boolean)
    .map(account => ({
      _id: account._id,
      account_id: account.account_id,
      mask: account.mask,
      current: numberOrZero(account.current ?? account.balances?.current),
      available: numberOrZero(account.available ?? account.balances?.available)
    }));
}

function buildGroupPayload(group, nextAccounts) {
  const serializedAccounts = serializeAccounts(nextAccounts);
  const totalCurrentBalance = serializedAccounts.reduce((sum, account) => sum + numberOrZero(account.current), 0);
  const totalAvailableBalance = serializedAccounts.reduce((sum, account) => sum + numberOrZero(account.available), 0);

  return {
    name: group.name,
    info: group.info || '',
    accounts: serializedAccounts,
    totalCurrentBalance,
    totalAvailableBalance,
    isLabel: true,
    sort: group.sort,
    isSelected: Boolean(group.isSelected)
  };
}

async function ensureAccountContextGroup(account) {
  const existingGroup = getAccountContextGroup(account);
  if (existingGroup?._id) {
    return existingGroup;
  }

  const resolvedAccount = resolveAccount(account);
  if (!resolvedAccount) {
    return null;
  }

  const sort = state.allUserGroups.reduce((maxSort, group) => {
    return Math.max(maxSort, numberOrZero(group?.sort));
  }, -1) + 1;

  const groupDraft = {
    _id: '',
    name: resolvedAccount.mask || resolvedAccount.name || 'Account',
    info: '',
    accounts: [resolvedAccount],
    sort,
    isSelected: false,
    isLabel: false
  };

  const payload = buildGroupPayload(groupDraft, [resolvedAccount]);
  const createdGroup = await groupsAPI.createGroup({
    ...payload,
    isLabel: false,
    isSelected: false,
    sort
  });

  if (!createdGroup) {
    return null;
  }

  createdGroup.isLabel = false;
  state.allUserGroups.push(createdGroup);
  state.allUserGroups.sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));

  return createdGroup;
}

async function persistLabelAccounts(labelGroup, nextAccounts) {
  const dedupedAccounts = [];
  const seenIds = new Set();

  nextAccounts.forEach((account) => {
    const resolved = resolveAccount(account);
    const key = accountKey(resolved || account);
    if (!key || seenIds.has(key)) {
      return;
    }

    seenIds.add(key);
    dedupedAccounts.push(resolved || account);
  });

  if (!dedupedAccounts.length) {
    await groupsAPI.deleteGroup(labelGroup._id);
    state.allUserGroups = state.allUserGroups.filter(group => group._id !== labelGroup._id);
    return 'deleted';
  }

  const payload = buildGroupPayload(labelGroup, dedupedAccounts);
  const updated = await groupsAPI.updateGroup(labelGroup._id, payload);
  const targetGroup = state.allUserGroups.find(group => group._id === labelGroup._id);

  if (targetGroup) {
    Object.assign(targetGroup, updated || payload);
    targetGroup.isLabel = true;
  }

  return 'updated';
}

async function saveAddLabel() {
  const targetAccount = addLabelTargetAccount.value;
  if (!targetAccount) {
    return;
  }

  const selectedIds = [...new Set(selectedLabelIds.value)];
  if (!selectedIds.length) {
    return;
  }

  const changedGroupIds = [];

  for (const labelId of selectedIds) {
    const label = sortedLabelGroups.value.find(existingLabel => existingLabel._id === labelId);
    if (!label) {
      continue;
    }

    const currentlyAssigned = (label.accounts || []).some(account => accountsMatch(account, targetAccount));
    if (currentlyAssigned) {
      continue;
    }

    const nextAccounts = [...(label.accounts || []), targetAccount];
    const outcome = await persistLabelAccounts(label, nextAccounts);
    if (outcome) {
      changedGroupIds.push(label._id);
    }
  }

  closeAddLabelModal();
  await refreshSelectedGroupIfNeeded(changedGroupIds);
}

async function removeLabelFromAccount(account, labelGroup) {
  const nextAccounts = (labelGroup.accounts || []).filter(labelAccount => !accountsMatch(labelAccount, account));
  closeAllMenus();

  await persistLabelAccounts(labelGroup, nextAccounts);
  await refreshSelectedGroupIfNeeded([labelGroup._id]);
}

function openCreateLabelModal() {
  newLabelInput.value = '';
  showCreateLabelModal.value = true;
}

function closeCreateLabelModal() {
  showCreateLabelModal.value = false;
  newLabelInput.value = '';
}

async function saveCreateLabel() {
  if (!canSaveNewLabel.value) {
    return;
  }

  const targetAccount = addLabelTargetAccount.value;
  if (!targetAccount) {
    return;
  }

  const nextName = newLabelInput.value.trim();
  const selectedAccounts = [targetAccount];

  const newGroup = {
    _id: '',
    name: nextName,
    info: '',
    accounts: selectedAccounts,
    sort: state.allUserGroups.reduce((maxSort, group) => {
      return Math.max(maxSort, numberOrZero(group?.sort));
    }, -1) + 1,
    isSelected: false,
    isLabel: true
  };

  const payload = buildGroupPayload(newGroup, selectedAccounts);
  const created = await groupsAPI.createGroup({
    ...payload,
    isLabel: true,
    isSelected: false,
    sort: newGroup.sort
  });

  if (created) {
    created.isLabel = true;
    state.allUserGroups.push(created);
    state.allUserGroups.sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
  }

  closeCreateLabelModal();
  closeAddLabelModal();
}

async function refreshSelectedGroupIfNeeded(changedGroupIds = []) {
  const selectedGroupId = state.selected.group?._id;
  if (!selectedGroupId || !changedGroupIds.includes(selectedGroupId)) {
    return;
  }

  await handleGroupChange({ forceRefresh: true, preserveSelectedTab: true });
}

function goToOnboarding() {
  router.push({ name: 'onboarding' });
}

async function handleBankConnected() {
  try {
    await fetchBanks();
    showBanksModal.value = false;
  } catch (error) {
    console.error('Error refreshing data after bank connection', error);
  }
}

async function handleBanksDataChanged() {
  try {
    const { groups, accounts, itemsNeedingReauth } = await fetchGroupsAndAccounts();

    state.itemsNeedingReauth = itemsNeedingReauth || [];
    state.allUserGroups = (groups || []).sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
    state.allUserAccounts = accounts || [];

    if (!state.allUserGroups.length || !state.allUserAccounts.length) {
      showBanksModal.value = false;
      router.push({ name: 'onboarding' });
      return;
    }

    await handleGroupChange({ forceRefresh: true, preserveSelectedTab: true });
  } catch (error) {
    console.error('Error refreshing groups and accounts after bank data change', error);
  }
}
</script>

<style scoped>
.dashboard-group-selector {
  --selector-bg: var(--theme-bg);
  --selector-bg-soft: var(--theme-bg-soft);
  --selector-bg-subtle: var(--theme-bg-subtle);
  --selector-text: var(--theme-text);
  --selector-text-soft: var(--theme-text-soft);
  --selector-border: var(--theme-border);
  --selector-overlay: var(--theme-overlay-90);
  background: transparent;
  color: var(--selector-text);
}

.selector-row {
  position: relative;
  background: transparent;
  transition: background-color 150ms ease;
  overflow: visible;
}

.row-main {
  cursor: pointer;
}

.row-menu-open {
  z-index: 80;
}

.menu-open {
  z-index: 80;
}

.selector-divider {
  border-color: var(--selector-border);
}

.selector-text {
  color: var(--selector-text);
}

.selector-muted {
  color: var(--selector-text-soft);
}

.label-chip {
  position: relative;
  border: 1px solid var(--selector-border);
  background: var(--selector-bg-soft);
  color: var(--selector-text);
  border-radius: 9999px;
  padding: 0.5rem 0.75rem;
  padding-right: 1.75rem;
  transition: opacity 150ms ease;
}

.label-chip:hover {
  opacity: 0.8;
}

.label-chip-active {
  background: var(--selector-bg-subtle);
}

.label-chip-count {
  color: var(--selector-text-soft);
}

.chip-menu-trigger {
  position: absolute;
  right: 0.25rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--selector-text-soft);
  border-radius: 9999px;
  padding: 0.125rem;
}

.chip-menu-trigger:hover {
  color: var(--selector-text);
  background: var(--selector-bg-subtle);
}

.row-title-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.row-menu-anchor-inline {
  position: relative;
}

.row-menu-trigger {
  color: var(--selector-text-soft);
  border-radius: 0.75rem;
  padding: 0.5rem;
  opacity: 0;
  transition: opacity 150ms ease, background-color 150ms ease, color 150ms ease;
}

.group:hover .row-menu-trigger,
.row-menu-trigger:focus-visible {
  opacity: 1;
}

.row-menu-trigger:hover {
  color: var(--selector-text);
  background: var(--selector-bg-subtle);
}

.selector-menu {
  position: absolute;
  min-width: 11rem;
  border: 1px solid var(--selector-border);
  border-radius: 0.75rem;
  background: var(--selector-overlay);
  backdrop-filter: blur(8px);
  z-index: 50;
  overflow: hidden;
}

.selector-menu-fixed {
  position: fixed;
  z-index: 120;
}

.selector-menu-item {
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.875rem;
  font-size: 0.625rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--selector-text);
  transition: background-color 150ms ease;
}

.selector-menu-item:hover {
  background: var(--selector-bg-soft);
}

.label-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--selector-border);
  background: var(--selector-bg-soft);
  color: var(--selector-text);
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 900;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 0.25rem 0.5rem;
}

.label-pill-clickable {
  padding-right: 0.25rem;
}

.label-pill-button {
  padding: 0 0.25rem;
}

.label-pill-menu {
  color: var(--selector-text-soft);
  padding: 0.125rem;
  border-radius: 9999px;
}

.label-pill-menu:hover {
  background: var(--selector-bg-subtle);
  color: var(--selector-text);
}

.utility-row {
  width: 100%;
  padding: 1.5rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  transition: background-color 150ms ease;
}

.utility-row:hover {
  background: var(--selector-bg-soft);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--selector-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 0.625rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--selector-text);
}

.modal-close {
  color: var(--selector-text-soft);
  border-radius: 0.75rem;
  padding: 0.5rem;
}

.modal-close:hover {
  color: var(--selector-text);
  background: var(--selector-bg-soft);
}

.modal-label {
  display: block;
  margin-bottom: 0.5rem;
  padding-left: 0.25rem;
  font-size: 0.625rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--selector-text-soft);
}

.modal-input {
  width: 100%;
  border: 1px solid var(--selector-border);
  background: var(--selector-bg);
  color: var(--selector-text);
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.modal-input::placeholder {
  color: var(--selector-text-soft);
}

.modal-input:focus {
  outline: 1px solid var(--theme-ring);
}

.modal-footer {
  padding: 2rem 1.5rem;
  border-top: 1px solid var(--selector-border);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-button-primary,
.modal-button-secondary,
.modal-button-danger {
  flex: 1;
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  font-size: 0.625rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  transition: opacity 150ms ease;
}

.modal-button-primary {
  background: var(--theme-btn-primary-bg);
  color: var(--theme-btn-primary-text);
}

.modal-button-primary:disabled {
  opacity: 0.4;
}

.modal-button-secondary {
  background: var(--selector-bg-soft);
  color: var(--selector-text-soft);
  border: 1px solid var(--selector-border);
}

.modal-button-secondary:hover {
  color: var(--selector-text);
}

.modal-button-danger {
  background: var(--theme-btn-primary-bg);
  color: var(--theme-btn-primary-text);
  border: 1px solid var(--selector-border);
}

.modal-button-danger:disabled {
  opacity: 0.4;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
}

.toggle-row:hover {
  background: var(--selector-bg-soft);
}

.label-option:hover {
  background: var(--selector-bg-soft);
}

.hide-scroll {
  scrollbar-width: none;
}

.hide-scroll::-webkit-scrollbar {
  display: none;
}
</style>
