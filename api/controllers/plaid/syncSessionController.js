import syncSessionService from '../../services/plaid/syncSessionService.js';
import recoveryService from '../../services/plaid/recoveryService.js';
import itemService from '../../services/plaid/itemService.js';

export default {
  /**
   * Get sync sessions for a specific item
   */
  async getSyncSessionsForItem(req, res) {
    try {
      const user = req.user;
      const { itemId } = req.params;
      const { limit = 20 } = req.query;
      
      const item = await itemService.getItem(itemId, user._id);
      
      if (!item) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'Item not found for this user'
        });
      }
      
      const syncSessions = await syncSessionService.getSyncSessionsForItem(
        itemId,
        user._id,
        { limit: parseInt(limit) }
      );
      
      // Map sessions to include formatted performance data
      const formattedSessions = syncSessions.map(session => {
        const formatted = { ...session };
        
        // Add nicely formatted time strings if timestamps exist
        if (session.startTimestamp) {
          formatted.startTimeFormatted = new Date(session.startTimestamp).toLocaleString();
        }
        
        if (session.endTimestamp) {
          formatted.endTimeFormatted = new Date(session.endTimestamp).toLocaleString();
        }
        
        return formatted;
      });
      
      return res.json({
        itemId,
        syncSessions: formattedSessions,
        currentSyncId: item.sync_id || null,
        count: syncSessions.length
      });
    } catch (error) {
      return res.status(400).json({
        error: 'FETCH_ERROR',
        message: error.message
      });
    }
  },
  
  /**
   * Initiates a reversion to a specific sync session
   * Renamed from performReversion for consistency
   */
  async initiateReversion(req, res) {
    const { itemId, sessionId } = req.params;
    const user = req.user;
    
    try {
      // Validate input parameters
      if (!itemId || !sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: itemId or sessionId'
        });
      }
      
      // Get the item first to pass to initiateReversion
      const item = await itemService.getItem(itemId, user._id);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }
      
      // Use our new initiateReversion method
      const result = await recoveryService.initiateReversion(
        sessionId,
        item,
        user
      );
      
      return res.json({
        success: result.success,
        removedCount: result.removedCount,
        revertedTo: result.revertedTo,
        error: result.error || null,
        performanceMetrics: result.performanceMetrics || null
      });
    } catch (error) {
      console.error('Error initiating reversion:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An error occurred during reversion'
      });
    }
  },
  
  /**
   * Continue without recovery for a specific recovery session
   * Creates a new sync session that skips the recovery process
   */
  async continueWithoutRecovery(req, res) {
    const { itemId, sessionId } = req.params;
    const user = req.user;
    
    try {
      // Validate input parameters
      if (!itemId || !sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: itemId or sessionId'
        });
      }
      
      // Get the item
      const item = await itemService.getItem(itemId, user._id);
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }
      
      // Get the recovery session
      const recoverySession = await syncSessionService.getSyncSession(sessionId, user);
      if (!recoverySession) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      // Verify this is a recovery session
      if (!recoverySession.isRecovery) {
        return res.status(400).json({
          success: false,
          error: 'This operation can only be performed on recovery sessions'
        });
      }
      
      // Create a new session that continues without recovery
      const newSession = await syncSessionService.createContinueWithoutRecoverySync(
        recoverySession,
        user,
        item
      );
      
      return res.json({
        success: true,
        newSessionId: newSession._id,
        message: 'Successfully continued without recovery',
        session: newSession
      });
    } catch (error) {
      console.error('Error continuing without recovery:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while continuing without recovery'
      });
    }
  }
}