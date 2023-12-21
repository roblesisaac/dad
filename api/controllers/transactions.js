import plaidTransactions from "../models/plaidTransactions";

const app = function() {
    async function update(_transactionId, body) {
        try {
            return await plaidTransactions.update(_transactionId, body);
        } catch (error) {
            return {
                error: true,
                errorMessage: error.toSring()
            }
        }
    }

    return {
        updateTransaction: async (req, res) => {
            const { _transactionId } = req.params;

            res.json(await update(_transactionId, req.body));
        }
    }
}();

export default app;