import itemService from '../../services/plaid/itemService.js';
import plaidService from '../../services/plaid/plaidService.js';

export default {
  async createLink(req, res) {
    try {
      const { itemId } = req.params;
      const link_token = await plaidService.createLinkToken(req.user, itemId);
      res.json({ link_token });
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  },

  async exchangeTokenAndSavePlaidItem(req, res) {
    try {
      const { public_token } = req.body;
      
      // 1. Exchange public token for access token
      const accessData = await plaidService.exchangePublicToken(public_token);
      
      // 2. Save or update the Plaid item
      const plaidItem = await itemService.savePlaidAccessData(accessData, req.user);
      
      res.json({
        status: 'success',
        data: {
          itemId: plaidItem.itemId,
          status: 'pending',
          message: 'Item connected successfully'
        }
      });
    } catch (error) {
      console.error('Exchange token error:', error);
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  }
}; 