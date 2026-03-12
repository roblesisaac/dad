<template>
  <div class="dashboard-group-selector" @click="closeAllMenus">
    <div
      v-if="activeLabelGroup"
      class="selector-menu selector-menu-fixed"
      :style="labelMenuStyles"
      data-menu-surface
    >
      <button type="button" class="selector-menu-item" @click.stop="openViewLabelAccounts(activeLabelGroup)">
        Edit Accounts
      </button>
      <button type="button" class="selector-menu-item" @click.stop="openRenameLabel(activeLabelGroup)">
        Rename
      </button>
      <button type="button" class="selector-menu-item" @click.stop="openDeleteLabel(activeLabelGroup)">
        Remove
      </button>
    </div>

    <section class="w-full">
      <div class="selector-row group">
        <div
          class="w-full text-left py-6 row-main select-none"
          role="button"
          tabindex="0"
          @click="handleAllAccountsRowSelect"
          @keydown.enter.prevent="handleAllAccountsRowSelect"
          @keydown.space.prevent="handleAllAccountsRowSelect"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 min-w-0 max-w-[60%]">
                <div class="text-base font-black uppercase tracking-tight truncate selector-text">
                  All Accounts
                </div>
              </div>
            </div>

            <span class="text-base font-black tracking-tight shrink-0 selector-text">
              {{ formatPrice(allAccountsNetBalance, { toFixed: 0 }) }}
            </span>
          </div>
        </div>
      </div>

      <Draggable
        v-model="dashboardAccounts"
        v-bind="dragOptions"
        handle=".handler-account"
        item-key="account_id"
        :disabled="!isAccountReorderActive"
        @end="handleAccountReorderEnd"
      >
        <template #item="{ element }">
          <div
            :key="accountKey(element)"
            :class="['selector-row group', { 'row-menu-open': accountRowHasOpenMenu(element) }]"
          >
            <div
              class="w-full text-left py-6 row-main select-none"
              role="button"
              tabindex="0"
              @click="handleAccountRowClick(element)"
              @keydown.enter.prevent="handleAccountRowSelect(element)"
              @keydown.space.prevent="handleAccountRowSelect(element)"
              @mousedown="handleAccountRowMouseDown($event, element)"
              @mousemove="handleAccountRowMouseMove"
              @mouseup="handleAccountRowMouseUp"
              @mouseleave="handleAccountRowMouseLeave"
              @touchstart.passive="handleAccountRowTouchStart($event, element)"
              @touchmove.passive="handleAccountRowTouchMove"
              @touchend="handleAccountRowTouchEnd"
              @touchcancel="clearAccountLongPressTimer"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1 flex items-start gap-3">
                  <GripVertical
                    v-if="isAccountInReorderMode(element)"
                    class="handler-account w-4 h-4 mt-1 selector-muted cursor-grab shrink-0"
                  />

                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="flex items-center gap-2 min-w-0 max-w-[60%]">
                        <span
                          v-if="accountRowMask(element)"
                          class="text-base font-black uppercase tracking-tight selector-muted flex-shrink-0"
                        >
                          {{ accountRowMask(element) }}
                        </span>
                        <div class="text-base font-black uppercase tracking-tight truncate selector-text">
                          {{ accountDisplayLabel(element) }}
                        </div>
                      </div>

                      <div v-if="!isExternalReorderActive" class="row-title-actions flex-shrink-0">
                        <div class="relative row-menu-anchor-inline" data-menu-surface>
                          <button
                            type="button"
                            class="row-menu-trigger"
                            :class="{ 'row-menu-trigger-visible': shouldShowAccountRowMenu(element) }"
                            data-menu-surface
                            @click.stop="toggleAccountMenu(element)"
                          >
                            <EllipsisVertical class="w-4 h-4" />
                          </button>

                          <div
                            v-if="activeAccountMenuId === accountKey(element)"
                            class="selector-menu left-0 mt-2"
                            data-menu-surface
                          >
                            <button type="button" class="selector-menu-item" @click.stop="startAccountReorderFromMenu(element)">
                              Rearrange Row
                            </button>
                            <button type="button" class="selector-menu-item" @click.stop="openAddLabelModal(element)">
                              Edit Labels
                            </button>
                            <button type="button" class="selector-menu-item" @click.stop="openRenameAccount(element)">
                              Rename Account
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      v-if="accountSubtitleText(element)"
                      class="mt-1 text-[10px] font-black tracking-[0.16em] truncate selector-muted"
                    >
                      {{ accountSubtitleText(element) }}
                    </div>
                  </div>
                </div>

                <div class="shrink-0">
                  <button
                    v-if="showNevermindForAccount(element)"
                    type="button"
                    class="px-3 py-2 rounded-xl border border-[var(--selector-border)] text-[10px] font-black uppercase tracking-widest selector-muted hover:selector-text transition-colors"
                    @click.stop="cancelAccountReorder"
                  >
                    Nevermind
                  </button>

                  <span
                    v-else
                    class="text-base font-black tracking-tight shrink-0 selector-text"
                  >
                    {{ formatPrice(accountNetBalance(element), { toFixed: 0 }) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Draggable>

      <div v-if="!sortedAccounts.length" class="py-12 text-center text-[10px] font-black uppercase tracking-[0.2em] selector-muted">
        No accounts
      </div>
    </section>

    <section class="py-8 selector-divider">
      <div class="pb-2">
        <h3 class="text-[10px] font-black uppercase tracking-[0.2em] selector-muted">
          View Accounts by Label
        </h3>
      </div>
      <div class="flex items-center gap-2 overflow-x-auto pb-1 hide-scroll">
        <div
          v-for="label in labelChipGroups"
          :key="label._id"
          :class="['relative flex-shrink-0', { 'menu-open': !isAllAccountsGroup(label) && activeLabelMenuId === label._id }]"
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
            v-if="!isAllAccountsGroup(label)"
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

    <div class="selector-divider">
    </div>

    <BaseModal
      v-if="showRenameModal"
      :is-open="showRenameModal"
      size="md"
      :title="renameModalTitle"
      @close="closeRenameModal"
    >

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
            v-if="renameType === 'account' && canRestoreDefaultAccountName"
            @click="restoreDefaultAccountName"
            class="modal-button-secondary"
            type="button"
          >
            Restore Default
          </button>
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
            :disabled="!sanitizeAccountText(renameInput)"
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
      v-if="showViewLabelAccountsModal"
      :is-open="showViewLabelAccountsModal"
      size="md"
      title="Edit Accounts"
      @close="closeViewLabelAccountsModal"
    >

      <template #content>
        <div class="py-2">
          <div
            v-for="account in viewLabelEnabledAccounts"
            :key="`view-label-enabled-${accountKey(account)}`"
            class="label-accounts-row"
          >
            <div class="min-w-0 pr-4">
              <div class="text-base font-black tracking-tight truncate selector-text">
                {{ accountDisplayLabel(account) }}
              </div>
            </div>
            <Switch
              :model-value="true"
              :id="`view-label-enabled-${accountKey(account)}`"
              @update:model-value="toggleViewLabelAccount(accountKey(account))"
            />
          </div>

          <button
            class="label-accounts-divider"
            type="button"
            @click="showViewLabelDisabledAccounts = !showViewLabelDisabledAccounts"
          >
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-[0.2em] selector-text">Disabled Accounts</span>
              <span class="text-[10px] font-black selector-muted">{{ viewLabelDisabledAccounts.length }}</span>
            </div>
            <ChevronDown v-if="showViewLabelDisabledAccounts" class="w-4 h-4 selector-muted" />
            <ChevronRight v-else class="w-4 h-4 selector-muted" />
          </button>

          <div v-if="showViewLabelDisabledAccounts">
            <div
              v-for="account in viewLabelDisabledAccounts"
              :key="`view-label-disabled-${accountKey(account)}`"
              class="label-accounts-row"
            >
              <div class="min-w-0 pr-4">
                <div class="text-base font-black tracking-tight truncate selector-text">
                  {{ accountDisplayLabel(account) }}
                </div>
              </div>
              <Switch
                :model-value="false"
                :id="`view-label-disabled-${accountKey(account)}`"
                @update:model-value="toggleViewLabelAccount(accountKey(account))"
              />
            </div>
          </div>
        </div>

        <div class="modal-footer-no-border">
          <button
            @click="closeViewLabelAccountsModal"
            class="modal-button-secondary"
            type="button"
          >
            Cancel
          </button>
          <button
            @click="saveViewLabelAccounts"
            class="modal-button-primary"
            type="button"
          >
            Save
          </button>
        </div>
      </template>
    </BaseModal>

    <BaseModal
      v-if="showAddLabelModal"
      :is-open="showAddLabelModal"
      title="Edit Labels"
      size="md"
      @close="closeAddLabelModal"
    >
      <template #content>
        <div class="edit-labels-modal">
          <div class="py-2">
            <div v-if="sortedLabelGroups.length" class="border-b selector-divider">
              <button
                v-for="label in sortedLabelGroups"
                :key="`add-label-${label._id}`"
                type="button"
                class="w-full px-6 py-4 text-left label-option"
                :disabled="isSavingAddLabel || isInlineCreatingLabel"
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
          </div>

          <div class="modal-footer modal-footer-sticky">
            <div v-if="isInlineCreateMode" class="inline-create-row">
              <input
                v-model="newLabelInput"
                type="text"
                class="modal-input inline-create-input"
                placeholder="Label name"
                :disabled="isInlineCreatingLabel"
                @keydown.enter.prevent="saveCreateLabelInline"
              />
              <button
                type="button"
                class="inline-create-confirm"
                :disabled="!canSaveNewLabelInline || isInlineCreatingLabel"
                @click="saveCreateLabelInline"
              >
                <Check class="w-4 h-4" />
              </button>
            </div>

            <template v-else>
              <button
                class="modal-button-secondary"
                :class="{ 'w-full': !showSaveAddLabelButton }"
                type="button"
                :disabled="isSavingAddLabel"
                @click="openCreateLabelInline"
              >
                Create New Label
              </button>

              <button
                v-if="showSaveAddLabelButton"
                @click="saveAddLabel"
                class="modal-button-primary"
                :disabled="!canSaveAddLabel"
                type="button"
              >
                {{ isSavingAddLabel ? 'Saving...' : 'Save' }}
              </button>
            </template>
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Check, ChevronDown, ChevronRight, EllipsisVertical, GripVertical, X } from 'lucide-vue-next';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useSelectGroup } from '@/features/select-group/composables/useSelectGroup';
import { useGroupsAPI } from '@/features/select-group/composables/useGroupsAPI';
import { useUtils } from '@/shared/composables/useUtils';
import { useDraggable } from '@/shared/composables/useDraggable';
import { ALL_ACCOUNTS_GROUP_ID } from '@/features/dashboard/constants/groups.js';
import BaseModal from '@/shared/components/BaseModal.vue';
import Switch from '@/shared/components/Switch.vue';

const emit = defineEmits(['group-selected']);
const props = defineProps({
  rearrangeActive: {
    type: Boolean,
    default: false
  }
});

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

const dashboardAccounts = ref([]);
const longPressReorderAccountId = ref('');
const longPressVisibleAccountId = ref('');
const suppressNextAccountSelectId = ref('');
const accountLongPressTimeoutId = ref(null);
const accountLongPressStart = ref({ x: 0, y: 0 });

const activeAccountMenuId = ref('');
const activeLabelMenuId = ref('');
const activeLabelMenuPosition = ref({ top: 0, left: 0 });

const showRenameModal = ref(false);
const renameInput = ref('');
const renameType = ref('label');
const renameTargetGroup = ref(null);

const showDeleteLabelModal = ref(false);
const deleteLabelTarget = ref(null);
const deleteLabelInput = ref('');

const showViewLabelAccountsModal = ref(false);
const viewLabelTarget = ref(null);
const viewLabelSelectedAccountIds = ref([]);
const showViewLabelDisabledAccounts = ref(false);

const showAddLabelModal = ref(false);
const addLabelTargetAccount = ref(null);
const selectedLabelIds = ref([]);
const initialSelectedLabelIds = ref([]);
const createdLabelIds = ref([]);
const isInlineCreateMode = ref(false);
const isSavingAddLabel = ref(false);
const isInlineCreatingLabel = ref(false);
const newLabelInput = ref('');

// const showBanksModal = ref(false);
const LONG_PRESS_DURATION_MS = 450;
const LONG_PRESS_MOVE_THRESHOLD_PX = 8;
const PREFERRED_GROUP_STORAGE_KEY = 'tracktabs.preferred-group-id';

const sortedLabelGroups = computed(() => {
  return [...labelGroups.value].sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
});
const allAccountsSystemLabel = computed(() => {
  return {
    _id: ALL_ACCOUNTS_GROUP_ID,
    name: 'All Accounts',
    isVirtualAllAccounts: true,
    accounts: state.allUserAccounts
  };
});
const labelChipGroups = computed(() => {
  return [allAccountsSystemLabel.value, ...sortedLabelGroups.value];
});
const allAccountsNetBalance = computed(() => {
  return (state.allUserAccounts || []).reduce((sum, account) => sum + accountNetBalance(account), 0);
});
const isExternalReorderActive = computed(() => props.rearrangeActive);

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
const isAccountReorderActive = computed(() => {
  return Boolean(longPressReorderAccountId.value || isExternalReorderActive.value);
});

const renameModalTitle = computed(() => {
  return renameType.value === 'account' ? 'Rename Account' : 'Rename Label';
});
const renameAccountDefaultName = computed(() => {
  if (renameType.value !== 'account') {
    return '';
  }

  const targetGroupAccount = Array.isArray(renameTargetGroup.value?.accounts)
    ? renameTargetGroup.value.accounts[0]
    : null;
  return accountDefaultLabel(targetGroupAccount);
});
const canRestoreDefaultAccountName = computed(() => {
  if (renameType.value !== 'account' || !renameTargetGroup.value?._id) {
    return false;
  }

  const defaultName = sanitizeAccountText(renameAccountDefaultName.value);
  if (!defaultName) {
    return false;
  }

  const currentName = sanitizeAccountText(renameTargetGroup.value?.name || '');
  return normalizedAccountText(currentName) !== normalizedAccountText(defaultName);
});

const hasLabelSelectionChanges = computed(() => {
  const initial = [...new Set(initialSelectedLabelIds.value)].sort();
  const selected = [...new Set(selectedLabelIds.value)].sort();

  if (initial.length !== selected.length) {
    return true;
  }

  return initial.some((id, index) => id !== selected[index]);
});

const showSaveAddLabelButton = computed(() => {
  return createdLabelIds.value.length > 0 || hasLabelSelectionChanges.value;
});

const canSaveAddLabel = computed(() => {
  if (isSavingAddLabel.value || isInlineCreatingLabel.value) {
    return false;
  }

  return showSaveAddLabelButton.value;
});

const canSaveNewLabelInline = computed(() => {
  if (isInlineCreatingLabel.value || isSavingAddLabel.value) {
    return false;
  }

  return sanitizeAccountText(newLabelInput.value).length > 0;
});

const viewLabelEnabledAccounts = computed(() => {
  const selectedIds = new Set(viewLabelSelectedAccountIds.value);
  return sortedAccounts.value.filter(account => selectedIds.has(accountKey(account)));
});

const viewLabelDisabledAccounts = computed(() => {
  const selectedIds = new Set(viewLabelSelectedAccountIds.value);
  return sortedAccounts.value.filter(account => !selectedIds.has(accountKey(account)));
});

watch(
  () => sortedAccounts.value,
  (accounts) => {
    if (!isAccountReorderActive.value) {
      dashboardAccounts.value = [...accounts];
    }
  },
  { immediate: true }
);

watch(
  () => props.rearrangeActive,
  (isActive) => {
    if (isActive) {
      dashboardAccounts.value = [...sortedAccounts.value];
    }

    exitAccountReorderMode();
  },
  { immediate: true }
);

onMounted(() => {
  document.addEventListener('click', closeMenusOnOutsideClick);
  window.addEventListener('resize', closeAllMenus);
  window.addEventListener('scroll', closeAllMenus, true);
});

onBeforeUnmount(() => {
  clearAccountLongPressTimer();
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

function sanitizeAccountText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\uFFFD+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedAccountText(value) {
  return sanitizeAccountText(value).toLowerCase();
}

function accountDefaultLabel(account) {
  const resolved = resolveAccount(account) || account;
  const officialName = sanitizeAccountText(resolved?.official_name || resolved?.officialName || '');
  const accountName = sanitizeAccountText(resolved?.name || '');

  let mask = '';
  if (resolved?.mask !== undefined && resolved?.mask !== null) {
    mask = sanitizeAccountText(String(resolved.mask));
  }

  return officialName || accountName || mask || 'Account';
}

function accountDisplayLabel(account) {
  const contextGroup = getAccountContextGroup(account);
  const contextGroupName = sanitizeAccountText(contextGroup?.name || '');
  const resolved = resolveAccount(account) || account;

  const officialName = sanitizeAccountText(resolved?.official_name || resolved?.officialName || '');
  const accountName = sanitizeAccountText(resolved?.name || '');
  let mask = '';
  if (resolved?.mask !== undefined && resolved?.mask !== null) {
    mask = sanitizeAccountText(String(resolved.mask));
  }

  const defaultLabel = officialName || accountName || mask || 'Account';

  if (!contextGroupName) {
    return defaultLabel;
  }

  const defaultNameCandidates = new Set(
    ['Account', officialName, accountName, mask]
      .map(value => normalizedAccountText(value))
      .filter(Boolean)
  );

  if (defaultNameCandidates.has(normalizedAccountText(contextGroupName))) {
    return defaultLabel;
  }

  return contextGroupName;
}

function accountRowMask(account) {
  const resolved = resolveAccount(account) || account;
  let mask = '';

  if (resolved?.mask !== undefined && resolved?.mask !== null) {
    mask = sanitizeAccountText(String(resolved.mask));
  }

  if (!mask) {
    return '';
  }

  const displayLabel = accountDisplayLabel(account);
  const normalizedDisplayLabel = normalizedAccountText(displayLabel);
  const normalizedMask = normalizedAccountText(mask);

  if (normalizedDisplayLabel === normalizedMask) {
    return '';
  }

  return mask;
}

function accountSubtitleText(account) {
  const resolved = resolveAccount(account) || account;
  return sanitizeAccountText(typeof resolved?.info === 'string' ? resolved.info : '');
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
  activeLabelMenuPosition.value = { top: 0, left: 0 };
  longPressVisibleAccountId.value = '';
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

function isAllAccountsGroup(group) {
  return Boolean(group?.isVirtualAllAccounts || group?._id === ALL_ACCOUNTS_GROUP_ID);
}

function writePreferredGroupIdToStorage(groupId) {
  const normalizedGroupId = String(groupId || '').trim();
  if (!normalizedGroupId || typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(PREFERRED_GROUP_STORAGE_KEY, normalizedGroupId);
  } catch (_error) {
    // Ignore storage write failures.
  }
}

function toggleAccountMenu(account) {
  if (isExternalReorderActive.value) {
    return;
  }

  const key = accountKey(account);
  if (isAccountReorderActive.value) {
    exitAccountReorderMode();
  }

  longPressVisibleAccountId.value = key;
  const nextId = activeAccountMenuId.value === key ? '' : key;
  activeAccountMenuId.value = nextId;
  activeLabelMenuId.value = '';
}

function startAccountReorderFromMenu(account) {
  if (isExternalReorderActive.value) {
    return;
  }

  activeAccountMenuId.value = '';
  triggerAccountLongPress(account);
}

function toggleLabelMenu(labelId, event) {
  if (activeLabelMenuId.value === labelId) {
    activeLabelMenuId.value = '';
    return;
  }

  activeLabelMenuId.value = labelId;
  activeAccountMenuId.value = '';

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

function accountRowHasOpenMenu(account) {
  const key = accountKey(account);
  if (!key) {
    return false;
  }

  return activeAccountMenuId.value === key;
}

function isAccountInReorderMode(account) {
  const key = accountKey(account);
  if (!key) {
    return false;
  }

  return isExternalReorderActive.value || longPressReorderAccountId.value === key;
}

function showNevermindForAccount(account) {
  if (isExternalReorderActive.value) {
    return false;
  }

  return isAccountInReorderMode(account);
}

function shouldShowAccountRowMenu(account) {
  if (isExternalReorderActive.value) {
    return false;
  }

  const key = accountKey(account);
  if (!key) {
    return false;
  }

  return (
    activeAccountMenuId.value === key ||
    longPressVisibleAccountId.value === key ||
    longPressReorderAccountId.value === key
  );
}

function clearAccountLongPressTimer() {
  if (accountLongPressTimeoutId.value) {
    clearTimeout(accountLongPressTimeoutId.value);
    accountLongPressTimeoutId.value = null;
  }
}

function shouldIgnoreAccountLongPressTarget(event) {
  const target = event?.target;
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('button, input, select, textarea, a, label'));
}

function triggerAccountLongPress(account) {
  if (isExternalReorderActive.value) {
    return;
  }

  const key = accountKey(account);
  if (!key) {
    return;
  }

  closeAllMenus();
  longPressVisibleAccountId.value = key;
  longPressReorderAccountId.value = key;
  suppressNextAccountSelectId.value = key;
}

function handleAccountRowTouchStart(event, account) {
  if (isExternalReorderActive.value) return;
  if (isAccountInReorderMode(account)) return;
  if (shouldIgnoreAccountLongPressTarget(event)) return;

  const touch = event.touches?.[0];
  if (!touch) return;

  accountLongPressStart.value = { x: touch.clientX, y: touch.clientY };
  suppressNextAccountSelectId.value = '';
  clearAccountLongPressTimer();

  accountLongPressTimeoutId.value = setTimeout(() => {
    triggerAccountLongPress(account);
    accountLongPressTimeoutId.value = null;
  }, LONG_PRESS_DURATION_MS);
}

function handleAccountRowTouchMove(event) {
  if (!accountLongPressTimeoutId.value) return;

  const touch = event.touches?.[0];
  if (!touch) return;

  const deltaX = Math.abs(touch.clientX - accountLongPressStart.value.x);
  const deltaY = Math.abs(touch.clientY - accountLongPressStart.value.y);

  if (deltaX > LONG_PRESS_MOVE_THRESHOLD_PX || deltaY > LONG_PRESS_MOVE_THRESHOLD_PX) {
    clearAccountLongPressTimer();
  }
}

function handleAccountRowTouchEnd() {
  clearAccountLongPressTimer();
}

function handleAccountRowMouseDown(event, account) {
  if (isExternalReorderActive.value) return;
  if (event.button !== 0) return;
  if (isAccountInReorderMode(account)) return;
  if (shouldIgnoreAccountLongPressTarget(event)) return;

  accountLongPressStart.value = { x: event.clientX, y: event.clientY };
  suppressNextAccountSelectId.value = '';
  clearAccountLongPressTimer();

  accountLongPressTimeoutId.value = setTimeout(() => {
    triggerAccountLongPress(account);
    accountLongPressTimeoutId.value = null;
  }, LONG_PRESS_DURATION_MS);
}

function handleAccountRowMouseMove(event) {
  if (!accountLongPressTimeoutId.value) return;

  const deltaX = Math.abs(event.clientX - accountLongPressStart.value.x);
  const deltaY = Math.abs(event.clientY - accountLongPressStart.value.y);

  if (deltaX > LONG_PRESS_MOVE_THRESHOLD_PX || deltaY > LONG_PRESS_MOVE_THRESHOLD_PX) {
    clearAccountLongPressTimer();
  }
}

function handleAccountRowMouseUp() {
  clearAccountLongPressTimer();
}

function handleAccountRowMouseLeave() {
  clearAccountLongPressTimer();
}

function handleAccountRowClick(account) {
  const key = accountKey(account);
  if (key && suppressNextAccountSelectId.value === key) {
    suppressNextAccountSelectId.value = '';
    return;
  }

  void handleAccountRowSelect(account);
}

function exitAccountReorderMode() {
  longPressReorderAccountId.value = '';
  activeAccountMenuId.value = '';
  longPressVisibleAccountId.value = '';
  suppressNextAccountSelectId.value = '';
}

function cancelAccountReorder() {
  exitAccountReorderMode();
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
    exitAccountReorderMode();
    return;
  }

  await Promise.allSettled(updateRequests);
  state.allUserGroups.sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));
  exitAccountReorderMode();
}

async function handleLabelChipSelect(labelGroup) {
  if (isAccountReorderActive.value) {
    return;
  }

  if (isAllAccountsGroup(labelGroup)) {
    await handleAllAccountsRowSelect();
    return;
  }

  closeAllMenus();
  emit('group-selected', labelGroup);

  try {
    await selectGroup(labelGroup);
  } catch (error) {
    console.error('Error selecting label group', error);
  }
}

function buildAllAccountsSelectionGroup() {
  return allAccountsSystemLabel.value;
}

async function handleAllAccountsRowSelect() {
  if (isAccountReorderActive.value) {
    return;
  }

  closeAllMenus();
  writePreferredGroupIdToStorage(ALL_ACCOUNTS_GROUP_ID);
  state.allUserGroups.forEach((group) => {
    group.isSelected = false;
  });

  const allAccountsGroup = buildAllAccountsSelectionGroup();
  state.selected.groupOverride = allAccountsGroup;
  emit('group-selected', allAccountsGroup);

  try {
    await handleGroupChange();
  } catch (error) {
    console.error('Error selecting all accounts group', error);
  }
}

async function handleAccountRowSelect(account) {
  if (isAccountReorderActive.value) {
    return;
  }

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
  renameInput.value = accountDisplayLabel(account);
  showRenameModal.value = true;
  activeAccountMenuId.value = '';
  longPressVisibleAccountId.value = '';
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
  const nextName = sanitizeAccountText(renameInput.value);
  if (!target?._id || !nextName) {
    return;
  }

  await groupsAPI.updateGroup(target._id, { name: nextName });
  target.name = nextName;
  closeRenameModal();
}

async function restoreDefaultAccountName() {
  const target = renameTargetGroup.value;
  const defaultName = sanitizeAccountText(renameAccountDefaultName.value);
  if (renameType.value !== 'account' || !target?._id || !defaultName) {
    return;
  }

  if (normalizedAccountText(target.name || '') === normalizedAccountText(defaultName)) {
    return;
  }

  await groupsAPI.updateGroup(target._id, { name: defaultName });
  target.name = defaultName;
  renameInput.value = defaultName;
  closeRenameModal();
}

function openDeleteLabel(labelGroup) {
  deleteLabelTarget.value = labelGroup;
  deleteLabelInput.value = '';
  showDeleteLabelModal.value = true;
  closeAllMenus();
}

function openViewLabelAccounts(labelGroup) {
  if (!labelGroup?._id) {
    return;
  }

  const selectedIds = (labelGroup.accounts || [])
    .map(account => accountKey(resolveAccount(account) || account))
    .filter(Boolean);

  viewLabelTarget.value = labelGroup;
  viewLabelSelectedAccountIds.value = [...new Set(selectedIds)];
  showViewLabelDisabledAccounts.value = false;
  showViewLabelAccountsModal.value = true;
  closeAllMenus();
}

function closeDeleteLabelModal() {
  showDeleteLabelModal.value = false;
  deleteLabelTarget.value = null;
  deleteLabelInput.value = '';
}

function closeViewLabelAccountsModal() {
  showViewLabelAccountsModal.value = false;
  viewLabelTarget.value = null;
  viewLabelSelectedAccountIds.value = [];
  showViewLabelDisabledAccounts.value = false;
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

function toggleViewLabelAccount(accountId) {
  if (!accountId) {
    return;
  }

  if (viewLabelSelectedAccountIds.value.includes(accountId)) {
    viewLabelSelectedAccountIds.value = viewLabelSelectedAccountIds.value.filter(id => id !== accountId);
    return;
  }

  viewLabelSelectedAccountIds.value = [...viewLabelSelectedAccountIds.value, accountId];
}

function openAddLabelModal(account) {
  addLabelTargetAccount.value = account;
  const assignedIds = labelsForAccount(account)
    .map(label => label?._id)
    .filter(Boolean);

  selectedLabelIds.value = [...new Set(assignedIds)];
  initialSelectedLabelIds.value = [...selectedLabelIds.value];
  createdLabelIds.value = [];
  isInlineCreateMode.value = false;
  isSavingAddLabel.value = false;
  isInlineCreatingLabel.value = false;
  newLabelInput.value = '';
  showAddLabelModal.value = true;
  activeAccountMenuId.value = '';
  longPressVisibleAccountId.value = '';
}

function closeAddLabelModal() {
  showAddLabelModal.value = false;
  addLabelTargetAccount.value = null;
  selectedLabelIds.value = [];
  initialSelectedLabelIds.value = [];
  createdLabelIds.value = [];
  isInlineCreateMode.value = false;
  isSavingAddLabel.value = false;
  isInlineCreatingLabel.value = false;
  newLabelInput.value = '';
}

function toggleAddLabelSelection(labelId) {
  if (!labelId || isSavingAddLabel.value || isInlineCreatingLabel.value) {
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
    name: accountDefaultLabel(resolvedAccount),
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
  if (isSavingAddLabel.value || isInlineCreatingLabel.value) {
    return;
  }

  const targetAccount = addLabelTargetAccount.value;
  if (!targetAccount) {
    return;
  }

  const selectedIds = new Set(selectedLabelIds.value);
  const changedGroupIds = [];

  isSavingAddLabel.value = true;

  try {
    for (const label of sortedLabelGroups.value) {
      if (!label?._id) {
        continue;
      }

      const currentlyAssigned = (label.accounts || []).some(account => accountsMatch(account, targetAccount));
      const shouldBeAssigned = selectedIds.has(label._id);

      if (currentlyAssigned === shouldBeAssigned) {
        continue;
      }

      const nextAccounts = shouldBeAssigned
        ? [...(label.accounts || []), targetAccount]
        : (label.accounts || []).filter(labelAccount => !accountsMatch(labelAccount, targetAccount));

      const outcome = await persistLabelAccounts(label, nextAccounts);
      if (outcome) {
        changedGroupIds.push(label._id);
      }
    }

    closeAddLabelModal();
    await refreshSelectedGroupIfNeeded(changedGroupIds);
  } catch (error) {
    console.error('Error saving account label changes', error);
  } finally {
    isSavingAddLabel.value = false;
  }
}

function openCreateLabelInline() {
  if (isSavingAddLabel.value) {
    return;
  }

  isInlineCreateMode.value = true;
  newLabelInput.value = '';
}

async function saveCreateLabelInline() {
  if (!canSaveNewLabelInline.value) {
    return;
  }

  const targetAccount = addLabelTargetAccount.value;
  if (!targetAccount) {
    return;
  }

  const nextName = sanitizeAccountText(newLabelInput.value);
  const selectedAccounts = [targetAccount];

  isInlineCreatingLabel.value = true;

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
  try {
    const created = await groupsAPI.createGroup({
      ...payload,
      isLabel: true,
      isSelected: false,
      sort: newGroup.sort
    });

    if (!created?._id) {
      return;
    }

    created.isLabel = true;
    state.allUserGroups.push(created);
    state.allUserGroups.sort((a, b) => Number(a?.sort || 0) - Number(b?.sort || 0));

    selectedLabelIds.value = [...new Set([...selectedLabelIds.value, created._id])];
    initialSelectedLabelIds.value = [...new Set([...initialSelectedLabelIds.value, created._id])];
    createdLabelIds.value = [...new Set([...createdLabelIds.value, created._id])];
    isInlineCreateMode.value = false;
    newLabelInput.value = '';
  } catch (error) {
    console.error('Error creating label inline', error);
  } finally {
    isInlineCreatingLabel.value = false;
  }
}

async function saveViewLabelAccounts() {
  const targetLabel = viewLabelTarget.value;
  if (!targetLabel?._id) {
    return;
  }

  const targetLabelId = targetLabel._id;
  const selectedIds = new Set(viewLabelSelectedAccountIds.value);
  const selectedAccounts = sortedAccounts.value.filter(account => selectedIds.has(accountKey(account)));

  await persistLabelAccounts(targetLabel, selectedAccounts);
  closeViewLabelAccountsModal();
  await refreshSelectedGroupIfNeeded([targetLabelId]);
}
async function refreshSelectedGroupIfNeeded(changedGroupIds = []) {
  const selectedGroupId = state.selected.group?._id;
  if (!selectedGroupId || !changedGroupIds.includes(selectedGroupId)) {
    return;
  }

  await handleGroupChange({ forceRefresh: true, preserveSelectedTab: true });
}


</script>

<style scoped>
.dashboard-group-selector {
  --selector-bg: var(--theme-browser-chrome);
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
  user-select: none;
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
  pointer-events: none;
  transition: opacity 150ms ease, background-color 150ms ease, color 150ms ease;
}

.row-menu-trigger:focus-visible,
.row-menu-trigger-visible {
  opacity: 1;
  pointer-events: auto;
}

.row-menu-trigger:hover {
  color: var(--selector-text);
  background: var(--selector-bg-subtle);
}

@media (hover: hover) and (pointer: fine) {
  .group:hover .row-menu-trigger {
    opacity: 1;
    pointer-events: auto;
  }
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

.utility-row:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--selector-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header-no-border {
  padding: 1.5rem;
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
  border: 1px solid var(--theme-border);
  background: var(--theme-browser-chrome);
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

.edit-labels-modal {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.modal-footer-sticky {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  background: var(--selector-bg);
  z-index: 20;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom));
}

.inline-create-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.inline-create-input {
  flex: 1;
  padding: 0.875rem 1rem;
  font-size: 0.875rem;
}

.inline-create-confirm {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border-radius: 9999px;
  border: 1px solid var(--theme-border);
  background: var(--theme-btn-primary-bg);
  color: var(--theme-btn-primary-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 150ms ease;
}

.inline-create-confirm:disabled {
  opacity: 0.4;
}

.modal-footer-no-border {
  padding: 2rem 1.5rem;
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
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  transition: opacity 150ms ease;
}

.modal-button-primary {
  background: var(--theme-btn-primary-bg);
  color: var(--theme-btn-primary-text);
  border: 1px solid var(--theme-border);
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
  border: 1px solid var(--theme-border);
}

.modal-button-danger:disabled {
  opacity: 0.4;
}

.label-accounts-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
}

.label-accounts-row:hover {
  background: var(--selector-bg-soft);
}

.label-accounts-divider {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
}

.label-accounts-divider:hover {
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
