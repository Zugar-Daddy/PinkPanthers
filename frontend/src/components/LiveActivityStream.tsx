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
        <div className="bg-white border-3 border-black rounded-2xl p-6 shadow-brutal space-y-4">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b-2 border-black">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neoSky border-2 border-black flex items-center justify-center text-black shadow-brutal-sm">
                        <Activity className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-black text-black tracking-tight font-sans">
                                Real-Time Activity Stream
                            </h2>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        </div>
                        <p className="text-xs text-zinc-600 font-mono">Autonomous payment execution trace across all agent fleet members</p>
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {(['all', 'finance', 'ops', 'growth', 'eng'] as FleetCategory[]).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase transition-all ${
                                selectedCategory === cat
                                    ? 'bg-black text-white border border-black shadow-brutal-xs'
                                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Event List */}
            <div className="divide-y-2 divide-black/10 max-h-96 overflow-y-auto pr-1">
                {filteredEvents.map(event => (
                    <div key={event.id} className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[#FFFDF8] transition-colors rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar tag */}
                            <div className="w-8 h-8 rounded-lg bg-black text-white font-mono font-black text-xs flex items-center justify-center border border-black shrink-0 shadow-brutal-xs">
                                {event.tag}
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-black text-black truncate">
                                        {event.agentName}
                                    </span>
                                    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border border-black ${
                                        event.category === 'finance'
                                            ? 'bg-neoMint text-black'
                                            : event.category === 'growth'
                                            ? 'bg-neoYellow text-black'
                                            : event.category === 'eng'
                                            ? 'bg-neoPurple text-black'
                                            : 'bg-neoRose text-black'
                                    }`}>
                                        {event.category}
                                    </span>
                                </div>
                                <div className="text-[11px] text-zinc-600 font-sans truncate">
                                    {event.action} <span className="font-bold text-black">• {event.vendor}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <div className="font-mono font-black text-xs text-black">
                                ${event.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                                {event.timeAgo}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Rails footer */}
            <div className="pt-3 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    rails · ach · card · sepa · pix · usdc
                </span>
                <span className="bg-neoMint px-2 py-0.5 rounded border border-black font-bold text-black">
                    streaming · all groups
                </span>
            </div>

        </div>
    );
};
