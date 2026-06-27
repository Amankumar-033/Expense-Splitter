// src/utils/minimizeTransactions.ts

export interface Transaction {
    from: string;
    to: string;
    amount: number;
}

export const minimizeCashFlow = (netBalances: Map<string, number>): Transaction[] => {
    // Array of { userId, amount }
    const debtors: { userId: string, amount: number }[] = [];
    const creditors: { userId: string, amount: number }[] = [];

    // Separate into debtors (-) and creditors (+)
    for (const [userId, amount] of netBalances.entries()) {
        if (amount < -0.01) {
            debtors.push({ userId, amount: Math.abs(amount) });
        } else if (amount > 0.01) {
            creditors.push({ userId, amount });
        }
    }

    // Sort both arrays descending (Greedy approach: match largest debtor with largest creditor)
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let i = 0; // index for debtors
    let j = 0; // index for creditors
    const transactions: Transaction[] = [];

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        // Find the minimum of the two balances
        const minAmount = Math.min(debtor.amount, creditor.amount);
        const settledAmount = Math.round(minAmount * 100) / 100;

        if (settledAmount > 0) {
            transactions.push({
                from: debtor.userId,
                to: creditor.userId,
                amount: settledAmount
            });
        }

        // Adjust the balances
        debtor.amount -= minAmount;
        creditor.amount -= minAmount;

        // If a balance drops below 1 paisa (0.01), move to the next person
        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return transactions;
};