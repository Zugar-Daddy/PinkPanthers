// Shared presentation styles, scoped to the two business dashboard tabs.
export const panelCard = 'min-w-0 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-card sm:p-6';
export const panelButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium shadow-subtle transition-colors hover:border-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50';
export const panelInput = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-900 outline-none transition-colors focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10';
export const rupees = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
