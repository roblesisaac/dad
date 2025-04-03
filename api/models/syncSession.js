import amptModel from '../utils/amptModel';

const syncSchema = {
    userId: String,
    item_id: String, // item._id
    itemId: String, // item.itemId
    status: {
        type: String,
        enum: ['queued', 'in_progress', 'complete', 'failed', 'recovered'],
        default: 'queued'
    },

    prevSession_id: String,
    nextSession_id: String,
    prevSuccessfulSession_id: String,
    recoverySession_id: String,
    recoveryDetails: {
        type: Object,
        default: null
    },

    cursor: String, // Cursor used for this sync
    nextCursor: String, // Next cursor provided by Plaid (if successful)

    hasMore: Boolean,
    lastNoChangesTime: Number,

    branchNumber: Number,
    syncTime: Number,
    syncId: String,
    syncTag: (syncTag, { branchNumber }) => {
        if(!branchNumber && syncTag) {
            return syncTag;
        }

        const [prefix, number] = syncTag.split('_');
        return `${prefix}_${branchNumber}`;
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
            added: [], 
            modified: [], 
            removed: [], 
            skipped: []
        }
    },

    // New fields as requested
    startTimestamp: Number,
    endTimestamp: Date,
    syncDuration: Number, // Performance tracking
    plaidRequestId: String, // For traceability with Plaid's logs

    isLegacy: Boolean,
    isRecovery: {
        type: Boolean,
        default: false
    },

    recoveryAttempts: Number,

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