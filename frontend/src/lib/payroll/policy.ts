import type { Employee, PayrollConfig, Payslip } from './types';

// Compensation is a fixed, editable policy assumption. Only profiles and attendance are fixture data.
export const SALARY_BANDS: Record<string, number> = { Engineer: 60000, Designer: 55000, Operations: 40000, HR: 45000, Finance: 50000, Support: 35000 };
export function samplePayroll(): PayrollConfig {
    const profiles = [
        ['Aarav Sharma', 'Engineer', 'Bengaluru', 1, 0, 0], ['Ananya Iyer', 'Designer', 'Chennai', 2, 1, 0],
        ['Rohan Mehta', 'Finance', 'Mumbai', 3, 0, 1], ['Diya Patel', 'Operations', 'Ahmedabad', 0, 2, 0],
        ['Arjun Nair', 'Engineer', 'Kochi', 1, 1, 0], ['Kavya Rao', 'HR', 'Hyderabad', 2, 0, 0],
        ['Vivaan Singh', 'Support', 'Delhi', 0, 0, 2], ['Ishita Das', 'Designer', 'Kolkata', 1, 2, 0],
        ['Aditya Kulkarni', 'Engineer', 'Pune', 4, 1, 0], ['Meera Joshi', 'Finance', 'Jaipur', 0, 0, 0],
        ['Kabir Khan', 'Operations', 'Lucknow', 2, 1, 1], ['Saanvi Reddy', 'HR', 'Hyderabad', 1, 0, 0],
        ['Dev Malhotra', 'Support', 'Chandigarh', 0, 3, 0], ['Nisha Menon', 'Engineer', 'Bengaluru', 2, 0, 1],
        ['Pranav Desai', 'Operations', 'Surat', 1, 1, 0]
    ] as const;
    return {
        name: 'PayMaster', month: new Date().toISOString().slice(0, 7), workingDays: 22, autoPay: true, enabled: true,
        batchLimit: 1000000, perEmployeeLimit: 100000, paidLeaveAllowance: 2, sickLeaveAllowance: 1,
        basicPercent: 40, pfPercent: 12, pfWageCap: 15000, professionalTax: 200,
        employees: profiles.map(([name, role, city, paidLeave, sickLeave, unpaidLeave], i) => ({
            id: `EMP-${String(i + 1).padStart(3, '0')}`, name, role, department: role, city,
            email: `${name.toLowerCase().replace(/ /g, '.')}@example.com`, payoutReference: `SIM-EMP-${String(i + 1).padStart(3, '0')}`,
            monthlyGross: SALARY_BANDS[role], tdsPercent: 0, paidLeave, sickLeave, unpaidLeave
        }))
    };
}
function number(value: unknown, name: string, min: number, max: number, step = 0.01): asserts value is number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || Math.abs(value / step - Math.round(value / step)) > 0.00001) throw new Error(`${name} must be between ${min} and ${max}, in steps of ${step}`);
}
function text(value: unknown, name: string, max = 100): asserts value is string {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Enter a valid ${name}`);
}
export function validateConfig(input: any): PayrollConfig {
    if (!input || typeof input !== 'object') throw new Error('Invalid payroll configuration');
    text(input.name, 'agent name', 60);
    if (typeof input.month !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(input.month)) throw new Error('Choose a payroll month between 2000 and 2099');
    number(input.workingDays, 'Working days', 1, new Date(Number(input.month.slice(0, 4)), Number(input.month.slice(5)), 0).getDate(), 1);
    if (typeof input.autoPay !== 'boolean' || typeof input.enabled !== 'boolean') throw new Error('Invalid agent automation setting');
    number(input.batchLimit, 'Batch limit', 1, 100000000); number(input.perEmployeeLimit, 'Employee limit', 1, input.batchLimit);
    number(input.paidLeaveAllowance, 'Paid leave allowance', 0, 31, 0.5); number(input.sickLeaveAllowance, 'Sick leave allowance', 0, 31, 0.5);
    number(input.basicPercent, 'Basic pay percentage', 0, 100); number(input.pfPercent, 'PF percentage', 0, 100);
    number(input.pfWageCap, 'PF wage cap', 0, 1000000); number(input.professionalTax, 'Professional tax', 0, 10000);
    if (!Array.isArray(input.employees) || input.employees.length !== 15) throw new Error('This example needs exactly 15 employees');
    const ids = new Set<string>(); const recipients = new Set<string>();
    const employees = input.employees.map((e: any): Employee => {
        if (!e || typeof e !== 'object') throw new Error('Invalid employee');
        if (typeof e.id !== 'string' || !/^EMP-\d{3}$/.test(e.id) || ids.has(e.id)) throw new Error('Employee IDs must be unique EMP-001 style identifiers');
        ids.add(e.id);
        for (const key of ['name', 'role', 'department', 'email', 'city']) text(e[key], `employee ${key}`);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) throw new Error(`Invalid email for ${e.name}`);
        if (typeof e.payoutReference !== 'string' || !/^SIM-[A-Z0-9-]{3,40}$/.test(e.payoutReference) || recipients.has(e.payoutReference)) throw new Error('Use unique SIM- prefixed simulated payroll destinations');
        recipients.add(e.payoutReference);
        number(e.monthlyGross, `${e.name}: monthly gross`, 1000, 1000000); number(e.tdsPercent, `${e.name}: TDS`, 0, 50);
        for (const key of ['paidLeave', 'sickLeave', 'unpaidLeave']) number(e[key], `${e.name}: ${key}`, 0, input.workingDays, 0.5);
        if (e.paidLeave + e.sickLeave + e.unpaidLeave > input.workingDays) throw new Error(`${e.name}: total leave exceeds working days`);
        return { id: e.id, name: e.name.trim(), role: e.role.trim(), department: e.department.trim(), email: e.email.trim(), city: e.city.trim(), payoutReference: e.payoutReference, monthlyGross: e.monthlyGross, tdsPercent: e.tdsPercent, paidLeave: e.paidLeave, sickLeave: e.sickLeave, unpaidLeave: e.unpaidLeave };
    });
    return { name: input.name.trim(), month: input.month, workingDays: input.workingDays, autoPay: input.autoPay, enabled: input.enabled, batchLimit: input.batchLimit, perEmployeeLimit: input.perEmployeeLimit, paidLeaveAllowance: input.paidLeaveAllowance, sickLeaveAllowance: input.sickLeaveAllowance, basicPercent: input.basicPercent, pfPercent: input.pfPercent, pfWageCap: input.pfWageCap, professionalTax: input.professionalTax, employees };
}

export const CALCULATION_RULES = `All monetary output is integer paise, rounded half up at EACH step. grossPay = monthlyGross INR * 100. unpaidDays = unpaidLeave + max(0,paidLeave-paidLeaveAllowance) + max(0,sickLeave-sickLeaveAllowance). paidDays = workingDays-unpaidDays. lossOfPay = round(grossPay*unpaidDays/workingDays). earnedGross = grossPay-lossOfPay. basicPay = round(earnedGross*basicPercent/100). pf = round(min(basicPay,pfWageCap*100)*pfPercent/100). professionalTax = earnedGross>0 ? configured professionalTax INR*100 : 0. tds = round(earnedGross*employee.tdsPercent/100). totalDeductions = lossOfPay+pf+professionalTax+tds. netPay = grossPay-totalDeductions. No other deductions, bonuses or taxes. Paid and sick leaves within their allowances are paid. Excess leave is unpaid. No carry-forward. Explain the leave calculation and each deduction with substituted numbers in INR.`;
/** Independent verifier only; these values are never substituted for missing AI output. */
export function verifyAmounts(e: Employee, c: PayrollConfig): Omit<Payslip, 'explanation'> {
    const grossPay = Math.round(e.monthlyGross * 100);
    const unpaidDays = e.unpaidLeave + Math.max(0, e.paidLeave - c.paidLeaveAllowance) + Math.max(0, e.sickLeave - c.sickLeaveAllowance);
    const paidDays = c.workingDays - unpaidDays;
    const lossOfPay = Math.round(grossPay * unpaidDays / c.workingDays);
    const earnedGross = grossPay - lossOfPay;
    const basicPay = Math.round(earnedGross * c.basicPercent / 100);
    const pf = Math.round(Math.min(basicPay, c.pfWageCap * 100) * c.pfPercent / 100);
    const professionalTax = earnedGross > 0 ? Math.round(c.professionalTax * 100) : 0;
    const tds = Math.round(earnedGross * e.tdsPercent / 100);
    const totalDeductions = lossOfPay + pf + professionalTax + tds;
    return { employeeId: e.id, grossPay, unpaidDays, paidDays, lossOfPay, earnedGross, basicPay, pf, professionalTax, tds, totalDeductions, netPay: grossPay - totalDeductions };
}
export function validatePayslips(result: any, config: PayrollConfig): Payslip[] {
    if (!Array.isArray(result?.employees) || result.employees.length !== config.employees.length) throw new Error('AI must calculate all 15 employees. No salaries were paid.');
    const ids = new Set();
    return config.employees.map(employee => {
        const row = result.employees.find((item: any) => item?.employeeId === employee.id);
        if (!row || ids.has(row.employeeId)) throw new Error(`AI omitted or duplicated ${employee.id}. No salaries were paid.`);
        ids.add(row.employeeId);
        const expected = verifyAmounts(employee, config);
        for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
            if (row[key] !== expected[key]) throw new Error(`AI calculation did not reconcile for ${employee.name}: ${key}. Retry calculation; no salaries were paid.`);
        }
        if (expected.netPay < 0 || !Number.isSafeInteger(expected.netPay)) throw new Error(`Deductions exceed ${employee.name}'s earned salary. Adjust the policy.`);
        if (typeof row.explanation !== 'string' || row.explanation.trim().length < 20 || row.explanation.length > 2400) throw new Error(`AI must explain ${employee.name}'s calculation`);
        // Preserve verified AI values, dropping any extra untrusted fields.
        return Object.fromEntries([...Object.keys(expected), 'explanation'].map(key => [key, row[key]])) as Payslip;
    });
}
