import amptModel from '../utils/amptModel';

const syncSchema = {
    userId: String,
    item_id: String, // item._id
    itemId: String, // item.itemId
    status: String,

    prevSession_id: String,
    nextSession_id: String,
    prevSuccessfulSession_id: String,

    cursor: String,
    nextCursor: String,

    hasMore: Boolean,
    lastNoChangesTime: Number,
    batchNumber: Number,
    syncTime: Number,
    syncId: String,
    syncNumber: Number,
    syncTag: (syncTag, { syncNumber }) => {
        if (!syncNumber && syncTag) {
            return syncTag;
        }

        // Return null if syncTag is not provided
        if (!syncTag) {
            return null;
        }

        const [prefix, number] = syncTag.split('_');
        return `${prefix}_${syncNumber}`;
    },

    syncCounts: {
        type: Object,
        default: {
            expected: { added: 0, modified: 0, removed: 0 },
            actual: { added: 0, modified: 0, removed: 0 }
        }
    },

    error: {
        type: Object,
        default: null
    },

    // New field for tracking failed transactions with detailed error information
    failedTransactions: {
        type: Object,
        default: {
            added: [], // Failed add operations with transaction data and errors
            modified: [], // Failed modify operations with transaction data and errors
            removed: []  // Failed remove operations with transaction IDs and errors
        }
    },

    isLegacy: Boolean,
    isRecovery: Boolean,

    recoveryAttempts: Number,
    recoveryStatus: String,
    recoveryDetails: {
        type: Object,
        default: null,
    },

    label1: {
        name: 'nextCursor',
        concat: ['itemId', 'nextCursor']
    },
    label2: {
        name: 'cursor',
        concat: ['itemId', 'cursor']
    },
    label4: {
        name: 'syncId',
        concat: ['itemId', 'syncId']
    },
    label3: 'itemId',
    label5: {
        name: 'itemIdTime',
        concat: ['itemId', 'syncTime']
    }
}

const SyncSessions = amptModel(['syncsession', 'userId'], syncSchema);

export default SyncSessions;