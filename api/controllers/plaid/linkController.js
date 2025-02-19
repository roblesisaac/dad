import { linkService } from '../../services/plaid';

export default {
  async createLink(req, res) {
    try {
      const { itemId } = req.params;
      const link_token = await linkService.createLinkToken(req.user, itemId);
      res.json({ link_token });
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  },

  async exchangeToken(req, res) {
    try {
      const { publicToken } = req.body;
      
      // Exchange public token for access token
      const accessData = await linkService.exchangePublicToken(publicToken);
      
      // Save or update the Plaid item
      const plaidItem = await linkService.savePlaidAccessData(accessData, req.user);
      
      res.json({
        status: 'success',
        data: plaidItem
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