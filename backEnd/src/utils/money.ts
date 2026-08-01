// Money is handled as integer paise everywhere inside the ledger.
// Floats lose precision (0.1 + 0.2 !== 0.3), so we only convert back to
// rupees at the edges when writing to the DB / responding to the client.

export const toPaise = (amount: number): number => Math.round(Number(amount) * 100);

export const toRupees = (paise: number): number => paise / 100;
