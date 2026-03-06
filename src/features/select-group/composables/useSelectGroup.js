import { useGroupsAPI } from './useGroupsAPI';
import { useDashboardState } from '@/features/dashboard/composables/useDashboardState';
import { useTabProcessing } from '@/features/tabs/composables/useTabProcessing.js';
import { useTransactions } from '@/features/dashboard/composables/useTransactions.js';
import { useUtils } from '@/shared/composables/useUtils';
import { computed } from 'vue';
import { ALL_ACCOUNTS_GROUP_ID } from '@/features/dashboard/constants/groups.js';

const GROUP_CHANGE_IN_FLIGHT_REQUESTS = new Map();
const GROUP_LABEL_MIGRATION_CACHE = new Set();
const GROUP_LABEL_NORMALIZATION_CACHE = new Set();
let GROUP_FETCH_TOAST_TOKEN = 0;

export function useSelectGroup() {
  const { state } = useDashboardState();
  const groupsAPI = useGroupsAPI();
  const { sortBy, waitUntilTypingStops, extractDateRange } = useUtils();

  const { fetchTransactionsForGroup } = useTransactions();
  const { processAllTabsForSelectedGroup } = useTabProcessing();

  const labelGroups = computed(() => {
    return state.allUserGroups.filter(group => group?.isLabel === true);
  });

  const accountContextGroups = computed(() => {
    return state.allUserGroups.filter(group => group?.isLabel === false);
  });

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

  function inferIsLabel(group) {
    const accounts = Array.isArray(group?.accounts) ? group.accounts : [];
    return accounts.length > 1;
  }

  async function migrateMissingGroupLabelFlags(groups) {
    if (!Array.isArray(groups) || !groups.length) {
      return;
    }

    const groupsNeedingMigration = groups.filter((group) => {
      const hasBooleanFlag = typeof group?.isLabel === 'boolean';
      const cacheKey = String(group?._id || '');
      return !hasBooleanFlag && cacheKey && !GROUP_LABEL_MIGRATION_CACHE.has(cacheKey);
    });

    if (!groupsNeedingMigration.length) {
      return;
    }

    await Promise.all(groupsNeedingMigration.map(async (group) => {
      const cacheKey = String(group._id || '');
      const nextIsLabel = inferIsLabel(group);

      try {
        await groupsAPI.updateGroup(group._id, { isLabel: nextIsLabel });
        group.isLabel = nextIsLabel;
        GROUP_LABEL_MIGRATION_CACHE.add(cacheKey);
      } catch (error) {
        console.error(`Failed to migrate isLabel for group ${group?._id}`, error);
        group.isLabel = nextIsLabel;
        GROUP_LABEL_MIGRATION_CACHE.add(cacheKey);
      }
    }));
  }

  async function normalizeInconsistentGroupLabelFlags(groups) {
    if (!Array.isArray(groups) || !groups.length) {
      return;
    }

    const groupsToNormalize = groups.filter((group) => {
      const accounts = Array.isArray(group?.accounts) ? group.accounts : [];
      const shouldBeLabel = accounts.length > 1;
      const isInconsistent = group?.isLabel === false && shouldBeLabel;
      const cacheKey = `${String(group?._id || '')}:false->true`;

      return Boolean(isInconsistent && group?._id && !GROUP_LABEL_NORMALIZATION_CACHE.has(cacheKey));
    });

    if (!groupsToNormalize.length) {
      return;
    }

    await Promise.all(groupsToNormalize.map(async (group) => {
      const cacheKey = `${String(group?._id || '')}:false->true`;

      try {
        await groupsAPI.updateGroup(group._id, { isLabel: true });
        group.isLabel = true;
        GROUP_LABEL_NORMALIZATION_CACHE.add(cacheKey);
      } catch (error) {
        console.error(`Failed to normalize isLabel for group ${group?._id}`, error);
        group.isLabel = true;
        GROUP_LABEL_NORMALIZATION_CACHE.add(cacheKey);
      }
    }));
  }

  function getAccountContextGroup(account) {
    return accountContextGroups.value.find((group) => {
      const groupAccounts = Array.isArray(group?.accounts) ? group.accounts : [];
      if (groupAccounts.length !== 1) {
        return false;
      }

      return groupAccounts.some(groupAccount => accountsMatch(groupAccount, account));
    }) || null;
  }

  /**
   * Fetch groups and accounts data
   */
  async function fetchGroupsAndAccounts() {
    const { groups, accounts, itemsNeedingReauth } = await groupsAPI.fetchGroupsAndAccounts();

    if (groups) {
      await migrateMissingGroupLabelFlags(groups);
      await normalizeInconsistentGroupLabelFlags(groups);
      // Sort groups by sort order
      return {
        groups: groups.sort(sortBy('sort')),
        accounts,
        itemsNeedingReauth
      };
    }

    return { groups, accounts, itemsNeedingReauth };
  }

  function formatAccounts(accounts) {
    const propsToKeep = ['_id', 'account_id', 'mask', 'current', 'available'];

    return accounts.map(account => {
      const accountData = {};
      propsToKeep.forEach(prop => accountData[prop] = account[prop] || account.balances?.[prop] || 0);
      return accountData;
    });
  }

  function numeric(value) {
    const number = parseFloat(value);
    return isNaN(number) ? 0 : number;
  }

  function sumOf(accounts, propName) {
    return accounts.reduce((acc, curr) => numeric(curr[propName]) + numeric(acc), 0);
  }

  function updateStateMemory(groupId, newGroupData) {
    const groupToUpdate = state.allUserGroups.find(group => group._id === groupId);
    groupToUpdate.totalAvailableBalance = newGroupData.totalAvailableBalance;
    groupToUpdate.totalCurrentBalance = newGroupData.totalCurrentBalance;
  }

  async function deleteGroup(groupToDelete) {
    if (!confirm('Remove Group?')) {
      return;
    }

    const idToRemove = groupToDelete._id;
    state.allUserGroups = state.allUserGroups.filter(group => group._id !== idToRemove);
    await groupsAPI.deleteGroup(idToRemove);

    return idToRemove;
  }

  async function createNewGroup() {
    if (!confirm('Are you sure you want to create a new group?')) {
      return;
    }

    const newGroupData = {
      accounts: [],
      isSelected: false,
      isLabel: true,
      name: `New Group ${state.allUserGroups.length}`
    };

    const savedNewGroup = await groupsAPI.createGroup(newGroupData);
    state.allUserGroups.push(savedNewGroup);

    return savedNewGroup;
  }

  async function updateGroupName(updatedGroup) {
    await waitUntilTypingStops();
    await groupsAPI.updateGroup(updatedGroup._id, {
      name: updatedGroup.name
    });
  }

  async function updateGroup(updatedGroup, previousGroup) {
    if (updatedGroup.name !== previousGroup.name) {
      await updateGroupName();
      return;
    }

    const accounts = formatAccounts(updatedGroup.accounts);

    const newGroupData = {
      name: updatedGroup.name,
      info: updatedGroup.info,
      accounts,
      totalCurrentBalance: sumOf(accounts, 'current'),
      totalAvailableBalance: sumOf(accounts, 'available')
    };

    updateStateMemory(updatedGroup._id, newGroupData);
    await groupsAPI.updateGroup(updatedGroup._id, newGroupData);
  }

  function setSelectedGroupInMemory(groupToSelect, allGroups = state.allUserGroups) {
    if (!groupToSelect?._id) {
      return null;
    }

    let selectedGroup = null;
    allGroups.forEach((group) => {
      const isTargetGroup = group?._id === groupToSelect._id;
      group.isSelected = Boolean(isTargetGroup);

      if (isTargetGroup) {
        selectedGroup = group;
      }
    });

    if (!selectedGroup) {
      groupToSelect.isSelected = true;
      selectedGroup = groupToSelect;
    }

    return selectedGroup;
  }

  /**
   * Select a group and deselect others
   */
  async function selectGroup(groupToSelect) {
    state.isLoading = true;
    state.selected.groupOverride = null;
    const selectedGroup = setSelectedGroupInMemory(groupToSelect, state.allUserGroups);
    if (!selectedGroup) {
      state.isLoading = false;
      return null;
    }

    await handleGroupChange();

    return selectedGroup;
  }

  /**
   * Select the first group in a list
   */
  async function selectFirstGroup(allGroups) {
    const firstGroup = allGroups[0];
    if (!firstGroup) return null;

    state.selected.groupOverride = null;

    return setSelectedGroupInMemory(firstGroup, allGroups);
  }

  async function updateGroupSort(groupId, sort) {
    await groupsAPI.updateGroupSort(groupId, sort);
  }

  function clearSelectedTabsForGroup(selectedGroup) {
    if (!selectedGroup?._id) return;

    if (selectedGroup?.isVirtualAllAccounts || selectedGroup?._id === ALL_ACCOUNTS_GROUP_ID) {
      state.allUserTabs.forEach((tab) => {
        tab.isSelected = false;
        tab.categorizedItems = [];
      });
      return;
    }

    state.allUserTabs.forEach((tab) => {
      const showForGroup = Array.isArray(tab.showForGroup) ? tab.showForGroup : [];
      const tabMatchesGroup = showForGroup.includes(selectedGroup._id) || showForGroup.includes('_GLOBAL');
      if (!tabMatchesGroup) return;

      tab.isSelected = false;
      tab.categorizedItems = [];
    });
  }

  /**
   * Handle group selection change
   */
  async function handleGroupChange(options = {}) {
    const {
      forceRefresh = false,
      preserveSelectedTab = false,
      showLoading = true
    } = options;
    let selectedGroup = state.selected.group;
    const tabsForGroup = state.selected.tabsForGroup;

    if (state.date.start > state.date.end) return;

    if (!selectedGroup) {
      if (!state.allUserGroups.length) {
        console.warn('No groups found in handleGroupChange.');
        return;
      }
      // selectedGroup = await selectFirstGroup(state.allUserGroups);
    }

    if (showLoading) {
      state.isLoading = true;
    }
    if (!preserveSelectedTab) {
      clearSelectedTabsForGroup(selectedGroup);
    }

    const dateRange = extractDateRange(state.date);
    const requestKey = `${selectedGroup?._id || ''}|${dateRange}|${preserveSelectedTab ? 'keep' : 'reset'}`;

    if (!forceRefresh) {
      const inFlightRequest = GROUP_CHANGE_IN_FLIGHT_REQUESTS.get(requestKey);
      if (inFlightRequest) {
        await inFlightRequest;
        return;
      }
    }

    const shouldShowFetchProgress = showLoading;
    const toastToken = shouldShowFetchProgress ? ++GROUP_FETCH_TOAST_TOKEN : 0;
    let latestProgressMessage = '0%';
    const updateLoadingMessage = (_completed, total, percentage) => {
      if (!shouldShowFetchProgress || !Number.isFinite(total) || total <= 0) {
        return;
      }

      latestProgressMessage = `${percentage}%`;
      state.blueBar.message = latestProgressMessage;
      state.blueBar.loading = percentage < 100;
    };

    if (shouldShowFetchProgress) {
      state.blueBar.message = latestProgressMessage;
      state.blueBar.loading = true;
    }

    const requestPromise = (async () => {
      // Fetch transactions for all accounts in the selected group
      state.selected.allGroupTransactions = await fetchTransactionsForGroup(
        selectedGroup,
        state.date,
        {
          forceRefresh,
          onProgress: (progress) => {
            updateLoadingMessage(
              progress.completedFetches,
              progress.totalFetches,
              progress.percentage
            );
          }
        }
      );

      if (tabsForGroup.length) {
        return await processAllTabsForSelectedGroup({ showLoading });
      }

      if (showLoading) {
        state.isLoading = false;
      }
    })();

    GROUP_CHANGE_IN_FLIGHT_REQUESTS.set(requestKey, requestPromise);

    try {
      await requestPromise;
    } finally {
      if (GROUP_CHANGE_IN_FLIGHT_REQUESTS.get(requestKey) === requestPromise) {
        GROUP_CHANGE_IN_FLIGHT_REQUESTS.delete(requestKey);
      }

      if (shouldShowFetchProgress && toastToken === GROUP_FETCH_TOAST_TOKEN) {
        state.blueBar.loading = false;

        setTimeout(() => {
          const currentMessage = state.blueBar.message;
          const isLatestToast = toastToken === GROUP_FETCH_TOAST_TOKEN;
          const isPercentageToast = typeof currentMessage === 'string' && /^\d{1,3}%$/.test(currentMessage);

          if (isLatestToast && isPercentageToast) {
            state.blueBar.message = null;
            state.blueBar.loading = false;
          }
        }, 1200);
      }
    }
  }

  return {
    accountContextGroups,
    createNewGroup,
    deleteGroup,
    fetchGroupsAndAccounts,
    handleGroupChange,
    getAccountContextGroup,
    labelGroups,
    selectGroup,
    selectFirstGroup,
    updateGroupName,
    updateGroup,
    updateGroupSort
  };
} 
