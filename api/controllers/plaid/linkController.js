import { linkService } from '../../services/plaid';

export default {
  async createLink(req, res) {
    try {
      const { itemId } = req.params;
      const linkToken = await linkService.createLinkToken(req.user, itemId);
      res.json(linkToken);
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
      const accessData = await linkService.exchangePublicToken(publicToken);
      const plaidItem = await linkService.savePlaidAccessData(accessData, req.user.encryptionKey);
      res.json(plaidItem);
    } catch (error) {
      res.status(400).json({ 
        error: error.message.split(': ')[0],
        message: error.message.split(': ')[1] 
      });
    }
  }
}; 