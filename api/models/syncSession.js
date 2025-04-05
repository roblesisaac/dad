import amptModel from '../utils/amptModel';

const syncSchema = {
    userId: String,
    item_id: String, // item._id
    itemId: String, // item.itemId
    status: {
        type: String,
        enum: ['queued', 'in_progress', 'complete', 'failed', 'error', 'recovered'],
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

    // Update the failedTransactions field with proper type definition
    failedTransactions: {
        type: Object,
        default: {
            added: [], 
            modified: [], 
            removed: [], 
            skipped: []
        },
        // Add specific serialization to ensure it's stored as JSON
        serialize: (value) => {
            if (!value) {
                console.log('syncSession: serializing empty failedTransactions');
                return JSON.stringify({
                    added: [], modified: [], removed: [], skipped: []
                });
            }
            
            try {
                // Handle case where value is already a string
                if (typeof value === 'string') {
                    // Validate it's proper JSON
                    JSON.parse(value);
                    console.log('syncSession: failedTransactions already serialized');
                    return value;
                }
                
                // Ensure value has the expected structure
                const result = {
                    added: Array.isArray(value.added) ? value.added : [],
                    modified: Array.isArray(value.modified) ? value.modified : [],
                    removed: Array.isArray(value.removed) ? value.removed : [],
                    skipped: Array.isArray(value.skipped) ? value.skipped : []
                };
                
                const serialized = JSON.stringify(result);
                console.log(`syncSession: serialized failedTransactions (${serialized.length} chars)`);
                return serialized;
            } catch (e) {
                console.error('syncSession: Error serializing failedTransactions:', e);
                return JSON.stringify({
                    added: [], modified: [], removed: [], skipped: [],
                    error: 'Serialization error'
                });
            }
        },
        deserialize: (value) => {
            if (!value || value === "") {
                console.log('syncSession: deserializing empty failedTransactions value');
                return {
                    added: [], modified: [], removed: [], skipped: []
                };
            }
            
            try {
                // Already an object, just ensure proper structure
                if (typeof value === 'object' && !Array.isArray(value)) {
                    console.log('syncSession: failedTransactions already an object');
                    return {
                        added: Array.isArray(value.added) ? value.added : [],
                        modified: Array.isArray(value.modified) ? value.modified : [],
                        removed: Array.isArray(value.removed) ? value.removed : [],
                        skipped: Array.isArray(value.skipped) ? value.skipped : []
                    };
                }
                
                // Parse the string
                const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                console.log('syncSession: deserialized failedTransactions successfully');
                
                return {
                    added: Array.isArray(parsed.added) ? parsed.added : [],
                    modified: Array.isArray(parsed.modified) ? parsed.modified : [],
                    removed: Array.isArray(parsed.removed) ? parsed.removed : [],
                    skipped: Array.isArray(parsed.skipped) ? parsed.skipped : []
                };
            } catch (e) {
                console.error('syncSession: Error deserializing failedTransactions:', e);
                return {
                    added: [], modified: [], removed: [], skipped: [],
                    deserializeError: typeof value === 'string' ? value.substring(0, 100) : String(value)
                };
            }
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