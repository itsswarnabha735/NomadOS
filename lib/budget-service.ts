import { db } from "./firebase";
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    where,
    serverTimestamp,
    addDoc,
    getDocs
} from "firebase/firestore";
import { TripBudgetSettings, Expense, Settlement, ExpenseSplit } from "../types";

// --- Budget Settings ---

export const createBudgetSettings = async (tripId: string, settings: TripBudgetSettings) => {
    const budgetRef = doc(db, "trips", tripId, "budget", "settings");
    await setDoc(budgetRef, settings);
};

export const updateBudgetSettings = async (tripId: string, settings: Partial<TripBudgetSettings>) => {
    const budgetRef = doc(db, "trips", tripId, "budget", "settings");
    await updateDoc(budgetRef, settings);
};

export const subscribeToBudgetSettings = (tripId: string, callback: (settings: TripBudgetSettings | null) => void) => {
    const budgetRef = doc(db, "trips", tripId, "budget", "settings");
    return onSnapshot(budgetRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data() as TripBudgetSettings);
        } else {
            callback(null);
        }
    });
};

// --- Expenses ---

export const addExpense = async (tripId: string, expense: Omit<Expense, "id" | "createdAt">) => {
    const expensesRef = collection(db, "trips", tripId, "expenses");
    await addDoc(expensesRef, {
        ...expense,
        createdAt: serverTimestamp()
    });
};

export const updateExpense = async (tripId: string, expenseId: string, expense: Partial<Expense>) => {
    const expenseRef = doc(db, "trips", tripId, "expenses", expenseId);
    await updateDoc(expenseRef, expense);
};

export const deleteExpense = async (tripId: string, expenseId: string) => {
    const expenseRef = doc(db, "trips", tripId, "expenses", expenseId);
    await deleteDoc(expenseRef);
};

export const subscribeToExpenses = (tripId: string, callback: (expenses: Expense[]) => void) => {
    const expensesRef = collection(db, "trips", tripId, "expenses");
    const q = query(expensesRef, orderBy("date", "desc"));

    return onSnapshot(q, (snapshot) => {
        const expenses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Expense[];
        callback(expenses);
    });
};

// --- Settlements ---

export const addSettlement = async (tripId: string, settlement: Omit<Settlement, "id" | "status">) => {
    const settlementsRef = collection(db, "trips", tripId, "settlements");
    await addDoc(settlementsRef, {
        ...settlement,
        status: 'completed', // Auto-complete for now, can be 'pending' if approval needed
        createdAt: serverTimestamp()
    });
};

export const subscribeToSettlements = (tripId: string, callback: (settlements: Settlement[]) => void) => {
    const settlementsRef = collection(db, "trips", tripId, "settlements");
    const q = query(settlementsRef, orderBy("date", "desc"));

    return onSnapshot(q, (snapshot) => {
        const settlements = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Settlement[];
        callback(settlements);
    });
};

// --- Logic / Math ---

export const calculateBalances = (expenses: Expense[], settlements: Settlement[], participants: string[]) => {
    const balances: Record<string, number> = {};

    // Initialize balances
    participants.forEach(p => balances[p] = 0);

    // Process Expenses
    expenses.forEach(expense => {
        const payerId = expense.payerId;
        const amount = expense.amount; // Base currency

        // Payer is effectively "lent" money to the group
        balances[payerId] = (balances[payerId] || 0) + amount;

        // Subtract shares from involved users
        if (expense.splitMethod === 'equal') {
            const splitAmount = amount / expense.involvedUsers.length;
            expense.involvedUsers.forEach(userId => {
                balances[userId] = (balances[userId] || 0) - splitAmount;
            });
        } else if (expense.splitMethod === 'exact') {
            Object.entries(expense.splitDetails).forEach(([userId, share]) => {
                balances[userId] = (balances[userId] || 0) - share;
            });
        } else if (expense.splitMethod === 'percentage') {
            Object.entries(expense.splitDetails).forEach(([userId, percentage]) => {
                const share = (amount * percentage) / 100;
                balances[userId] = (balances[userId] || 0) - share;
            });
        } else if (expense.splitMethod === 'shares') {
            const totalShares = Object.values(expense.splitDetails).reduce((a, b) => a + b, 0);
            Object.entries(expense.splitDetails).forEach(([userId, shares]) => {
                const share = (amount * shares) / totalShares;
                balances[userId] = (balances[userId] || 0) - share;
            });
        }
    });

    // Process Settlements (Direct payments reduce debt)
    settlements.forEach(settlement => {
        // FromUser paid ToUser. 
        // FromUser's balance increases (they paid off debt).
        // ToUser's balance decreases (they got paid back).
        balances[settlement.fromUserId] = (balances[settlement.fromUserId] || 0) + settlement.amount;
        balances[settlement.toUserId] = (balances[settlement.toUserId] || 0) - settlement.amount;
    });

    return balances;
};
