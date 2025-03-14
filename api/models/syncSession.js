import amptModel from '../utils/amptModel';

const syncSchema = {
    userId: String,
    item_id: String, // item._id
    itemId: String, // item.itemId
    status: String,

    cursor: String,
    previousCursor: String,
    nextCursor: String,
    prevSuccessfulCursor: String,
    hasMore: Boolean,

    lastNoChangesTime: Number,
    batchNumber: Number,
    syncTime: Number,
    syncId: String,

    error: {
        type: Object,
        default: null
    },
    
    syncCounts: {
        type: Object,
        default: {
            expected: { added: 0, modified: 0, removed: 0 },
            actual: { added: 0, modified: 0, removed: 0 }
        }
    },

    recoveryAttempts: Number,
    recoveryStatus: String,

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