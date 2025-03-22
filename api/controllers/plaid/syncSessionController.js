import syncSessionService from '../../services/plaid/syncSessionService.js';
import recoveryService from '../../services/plaid/recoveryService.js';
import itemService from '../../services/plaid/itemService.js';
import { CustomError } from '../../services/plaid/customError.js';

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
      
      return res.json({
        itemId,
        syncSessions,
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
   * Revert to a specific sync session
   */
  async revertToSyncSession(req, res) {
    try {
      const user = req.user;
      const { itemId, sessionId } = req.params;
      
      if (!itemId || !sessionId) {
        return res.status(400).json({
          error: 'INVALID_PARAMS',
          message: 'Missing itemId or sessionId'
        });
      }
      
      // Get the item
      const item = await itemService.getItem(itemId, user._id);
      
      if (!item) {
        return res.status(404).json({
          error: 'ITEM_NOT_FOUND',
          message: 'Item not found for this user'
        });
      }
      
      // Get the target sync session
      const targetSession = await syncSessionService.getSyncSession(sessionId, user);
      
      if (!targetSession) {
        return res.status(404).json({
          error: 'SESSION_NOT_FOUND',
          message: 'Sync session not found'
        });
      }
      
      // Ensure the session belongs to the specified item
      if (targetSession.itemId !== itemId) {
        return res.status(400).json({
          error: 'INVALID_SESSION',
          message: 'Session does not belong to the specified item'
        });
      }
      
      // Perform the reversion
      const result = await recoveryService.revertToSyncSession(targetSession, item, user);
      
      if (!result.success) {
        throw new CustomError('REVERT_FAILED', result.error || 'Failed to revert to session');
      }
      
      return res.json({
        success: true,
        itemId,
        revertedTo: result.revertedTo,
        removedCount: result.removedCount,
        recoverySession: result.recoverySession,
        message: `Successfully reverted to session. ${result.removedCount} transactions removed.`
      });
    } catch (error) {
      return res.status(500).json({
        error: error.code || 'REVERT_ERROR',
        message: error.message
      });
    }
  }
}