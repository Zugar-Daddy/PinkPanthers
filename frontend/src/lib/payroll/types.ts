export const PAYMASTER_ID = 'paymaster-01';
export type Employee = {
    id: string; name: string; role: string; department: string; email: string; city: string;
    payoutReference: string; monthlyGross: number; tdsPercent: number;
    paidLeave: number; sickLeave: number; unpaidLeave: number;
};
export type PayrollConfig = {
    name: string; month: string; workingDays: number; autoPay: boolean; enabled: boolean;
    batchLimit: number; perEmployeeLimit: number; paidLeaveAllowance: number; sickLeaveAllowance: number;
    basicPercent: number; pfPercent: number; pfWageCap: number; professionalTax: number;
    employees: Employee[];
};
export type Payslip = {
    employeeId: string; unpaidDays: number; paidDays: number; grossPay: number; lossOfPay: number;
    earnedGross: number; basicPay: number; pf: number; professionalTax: number; tds: number;
    totalDeductions: number; netPay: number; explanation: string;
};
export type PayrollRun = {
    id: string; requestId: string; month: string; revision: number; config: PayrollConfig;
    status: 'CALCULATING' | 'READY' | 'PAID' | 'FAILED'; startedAt: string; calculatedAt?: string;
    paidAt?: string; model?: string; rows: Payslip[]; totalNet: number; error?: string;
    receipts?: { id: string; employeeId: string; amountMinor: number }[];
};
export type PaymasterState = { revision: number; config: PayrollConfig; runs: PayrollRun[]; spendDay?: string };
