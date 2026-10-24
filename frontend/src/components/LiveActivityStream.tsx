'use client';

import React, { useState } from 'react';
import { Activity, Fuel, CheckCircle2, ArrowRight, ShieldCheck, Filter } from 'lucide-react';
import { AgentWalletClient, FleetCategory } from '../lib/web3/agentWalletClient';

interface LiveActivityStreamProps {
    wallet: AgentWalletClient;
}

export const LiveActivityStream: React.FC<LiveActivityStreamProps> = ({ wallet }) => {
    const [selectedCategory, setSelectedCategory] = useState<FleetCategory>('all');

    const filteredEvents = wallet.activityStream.filter(e => {
        if (selectedCategory === 'all') return true;
        return e.category === selectedCategory;
    });

    return (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover space-y-4 transition-all duration-200">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-stone-200/80">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 border border-stone-200/80 flex items-center justify-center shadow-subtle">
                        <Activity className="w-5 h-5 text-stone-700" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-serif font-semibold text-stone-900 tracking-tight">
                                Real-Time Activity Stream
                            </h2>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <p className="text-xs text-stone-500 font-sans">Autonomous payment execution trace across all agent fleet members</p>
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {(['all', 'finance', 'ops', 'growth', 'eng'] as FleetCategory[]).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-mono uppercase transition-all ${
                                selectedCategory === cat
                                    ? 'bg-stone-900 text-white font-medium shadow-xs'
                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600 font-normal'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Event List */}
            <div className="divide-y divide-stone-200/60 max-h-96 overflow-y-auto pr-1">
                {filteredEvents.map(event => (
                    <div key={event.id} className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-stone-50/70 transition-colors rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar tag */}
                            <div className="w-7 h-7 rounded-lg bg-stone-900 text-white font-mono text-xs flex items-center justify-center shrink-0">
                                {event.tag}
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-semibold text-stone-900 truncate">
                                        {event.agentName}
                                    </span>
                                    <span className={`text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full border ${
                                        event.category === 'finance'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : event.category === 'growth'
                                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                                            : event.category === 'eng'
                                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                            : 'bg-stone-100 text-stone-700 border-stone-200'
                                    }`}>
                                        {event.category}
                                    </span>
                                </div>
                                <div className="text-[11px] text-stone-500 font-sans truncate">
                                    {event.action} <span className="font-medium text-stone-700">• {event.vendor}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <div className="font-mono font-medium text-xs text-stone-900">
                                ${event.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-mono text-stone-400">
                                {event.timeAgo}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Rails footer */}
            <div className="pt-3 border-t border-stone-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-stone-400 uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    rails · ach · card · sepa · pix · usdc
                </span>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                    streaming · all groups
                </span>
            </div>

        </div>
    );
};
