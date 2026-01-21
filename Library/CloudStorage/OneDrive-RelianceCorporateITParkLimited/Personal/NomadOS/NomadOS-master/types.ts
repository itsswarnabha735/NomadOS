export type TripRole = 'owner' | 'editor' | 'viewer';

export interface TripParticipant {
    userId: string;
    userEmail: string;
    userName: string;
    userAvatar?: string;
    role: TripRole;
    joinedAt: any; // Timestamp
    invitedBy?: string;
}

export interface Trip {
    id: string;
    name?: string;
    destinations?: string[];
    destination: string; // Kept for legacy compatibility
    startDate: string;
    endDate: string;
    image?: string;

    // Sharing fields
    ownerId?: string;
    isShared?: boolean;
    shareCode?: string;
    participants?: string[]; // Array of user IDs for quick lookup
    participantCount?: number;
}

export interface Activity {
    id: string;
    description: string;
    day: number;
    order: number;
    type?: 'place' | 'poi';
    parentId?: string;
    location?: {
        lat: number;
        lng: number;
        name: string;
    };
    createdAt: any;
}

export interface TravelDocument {
    id: string;
    category?: string;
    type: string;
    date: string | null;
    time: string | null;
    reference_number: string;
    summary: string;
    url: string;
    createdAt: any;
    mimeType?: string;
}

// --- Budget & Expense Types ---

export interface BudgetCategory {
    id: string;
    name: string;
    icon: string; // Emoji or icon name
    cap?: number;
    isDefault: boolean;
}

export interface TripBudgetSettings {
    baseCurrency: string; // e.g., 'USD'
    tripType: 'total_cap' | 'daily_allowance';
    totalCap?: number;
    dailyAllowance?: number; // Per person
    bufferPercentage: number; // e.g., 10
    categories: BudgetCategory[];

    // Prediction fields
    travelStyle?: 'budget' | 'midrange' | 'premium';
    predictionApplied?: boolean;
    predictionId?: string;  // Reference to applied prediction
}


export interface ExpenseSplit {
    [userId: string]: number; // Amount or share depending on method
}

export interface Expense {
    id: string;
    tripId: string;
    description: string;
    amount: number; // In base currency
    originalAmount: number; // In transaction currency
    currency: string; // Transaction currency
    exchangeRate: number;
    date: any; // Timestamp
    category: string; // Category ID
    payerId: string;

    splitMethod: 'equal' | 'exact' | 'percentage' | 'shares';
    splitDetails: ExpenseSplit;
    involvedUsers: string[];

    receiptUrl?: string;
    linkedActivityId?: string;
    createdBy: string;
    createdAt: any;
}

export interface Settlement {
    id: string;
    tripId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency: string;
    date: any; // Timestamp
    paymentMethod?: string;
    note?: string;
    status?: 'pending' | 'completed';
    createdAt?: any; // Timestamp
}
