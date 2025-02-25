import linkController from './linkController';
import itemController from './itemController';
import transactionController from './transactionController';
import maintenanceController from './maintenanceController';
import onboardingController from './onboardingController';

export default {
  // Link and Authentication
  connectLink: linkController.createLink,
  exchangeTokenAndSavePlaidItem: linkController.exchangeTokenAndSavePlaidItem,

  // Items and Accounts
  getUserItems: itemController.getUserItems,
  retreivePlaidItems: itemController.syncItems,
  syncAccountsAndGroups: itemController.syncAccountsAndGroups,

  // Transactions
  getTransactions: transactionController.getTransactions,
  syncTransactionsForEachItem: transactionController.syncTransactionsForEachItem,

  // Maintenance
  getDuplicates: maintenanceController.getDuplicates,
  removeFromDb: maintenanceController.removeDuplicates,

  // Onboarding (batch-based approach)
  startOnboardingSync: onboardingController.startSync,
  getOnboardingStatus: onboardingController.getSyncStatus,
}; 