import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        service: 'SafeAgent Copilot Intent Parser',
        supportedProviders: ['gemini', 'openai'],
        model: 'gemini-1.5-flash / gpt-4o-mini',
        status: 'online'
    });
}

export interface ParsedIntentResult {
    domain: 'TRAVEL_BUS' | 'TRAVEL_TRAIN' | 'TRAVEL_FLIGHT' | 'GROCERY' | 'PAYROLL' | 'CLOUD_INFRA' | 'AI_BILLING' | 'SECURITY_ATTACK' | 'CARD_FREEZE' | 'UNKNOWN';
    vendor: string;
    targetAddress: string;
    amountINR: number;
    delegatedAgentId: string;
    summary: string;
    actionDesc: string;
    parameters: {
        source?: string;
        destination?: string;
        date?: string;
        time?: string;
        classType?: string;
        items?: Array<{ name: string; quantity: number; price: number }>;
        employeeCount?: number;
        recipientAddress?: string;
    };
    missingParameters: Array<{
        key: string;
        question: string;
        options: string[];
        default: string;
    }>;
    isExceedingPolicy: boolean;
    requiresApproval: boolean;
    reasoning: string;
    source: 'llm_gemini' | 'llm_openai' | 'local_fallback';
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, apiKey, provider = 'gemini' } = body;

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ success: false, error: 'Query string is required' }, { status: 400 });
        }

        const effectiveKey = apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

        // 1. If API key is available, call LLM
        if (effectiveKey) {
            try {
                if (provider === 'gemini' || effectiveKey.startsWith('AIza')) {
                    const llmResult = await parseWithGemini(query, effectiveKey);
                    if (llmResult) return NextResponse.json({ success: true, ...llmResult, source: 'llm_gemini' });
                } else if (provider === 'openai' || effectiveKey.startsWith('sk-')) {
                    const llmResult = await parseWithOpenAI(query, effectiveKey);
                    if (llmResult) return NextResponse.json({ success: true, ...llmResult, source: 'llm_openai' });
                }
            } catch (err: any) {
                console.warn('LLM call failed, falling back to local engine:', err?.message);
            }
        }

        // 2. Offline / Local Smart Fallback Engine
        const fallbackResult = parseWithLocalEngine(query);
        return NextResponse.json({ success: true, ...fallbackResult, source: 'local_fallback' });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || 'Internal parsing error' }, { status: 500 });
    }
}

/**
 * Call Google Gemini 1.5 Flash via REST API
 */
async function parseWithGemini(query: string, apiKey: string): Promise<ParsedIntentResult | null> {
    const prompt = `You are the SafeAgent Treasury AI Copilot intent and parameter extractor for an enterprise autonomous agent wallet operating on ERC-4337 smart accounts and Indian financial rails.
Analyze the user's natural language instruction and extract structured intent, financial parameters, and identify any missing nuances (such as unspecified travel dates, departure times, or item preferences).

User query: "${query}"

Return strict JSON conforming to this schema:
{
  "domain": "TRAVEL_BUS" | "TRAVEL_TRAIN" | "TRAVEL_FLIGHT" | "GROCERY" | "PAYROLL" | "CLOUD_INFRA" | "AI_BILLING" | "SECURITY_ATTACK" | "CARD_FREEZE" | "UNKNOWN",
  "vendor": string,
  "targetAddress": string,
  "amountINR": number,
  "delegatedAgentId": "concierge-08" | "finance-07" | "devops-04",
  "summary": string,
  "actionDesc": string,
  "parameters": {
    "source": string or null,
    "destination": string or null,
    "date": string or null,
    "time": string or null,
    "classType": string or null,
    "items": [{"name": string, "quantity": number, "price": number}] or null,
    "employeeCount": number or null
  },
  "missingParameters": [
    {
      "key": "date" or "time" or "classType" or "items",
      "question": string,
      "options": [string, string, string],
      "default": string
    }
  ],
  "isExceedingPolicy": boolean,
  "requiresApproval": boolean,
  "reasoning": string
}

Note:
- "10 Lakhs" / "10L" = 1000000 INR. "1 Crore" / "1Cr" = 10000000 INR. "50k" = 50000 INR.
- Employee payroll routes to finance-07. If amount > 300000, set isExceedingPolicy = true.
- Bus routes to concierge-08 (vendor: RedBus Intercity Mobility, address: 0x00000000000000000000000000000000000F6F6F).
- Train routes to concierge-08 (vendor: Travel & Ticket Booking API (IRCTC Railways), address: 0x00000000000000000000000000000000000C3C3C).
- Flight routes to concierge-08 (vendor: Travel & Ticket Booking API (IndiGo), address: 0x00000000000000000000000000000000000C3C3C).
- If date or time is not specified for travel, add them to missingParameters so the user can choose.
- Always require user approval before payment execution.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        })
    });

    if (!res.ok) {
        throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    return JSON.parse(text) as ParsedIntentResult;
}

/**
 * Call OpenAI GPT-4o-mini via REST API
 */
async function parseWithOpenAI(query: string, apiKey: string): Promise<ParsedIntentResult | null> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are the SafeAgent Treasury AI Copilot. Return strict JSON extracting domain, vendor, targetAddress, amountINR, delegatedAgentId, actionDesc, parameters, missingParameters, isExceedingPolicy, and requiresApproval.'
                },
                {
                    role: 'user',
                    content: query
                }
            ]
        })
    });

    if (!res.ok) {
        throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;

    return JSON.parse(text) as ParsedIntentResult;
}

/**
 * Local Semantic Parser (with Indian denominations & nuance detection)
 */
function parseWithLocalEngine(query: string): ParsedIntentResult {
    const lower = query.toLowerCase();

    // 1. Denomination parser: 10 Lakhs, 5 Lakh, 2 Cr, 50k
    const parseIndianAmount = (text: string): number | null => {
        const croreMatch = text.match(/([\d,]+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
        if (croreMatch) return parseFloat(croreMatch[1].replace(/,/g, '')) * 10000000;

        const lakhMatch = text.match(/([\d,]+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b/i);
        if (lakhMatch) return parseFloat(lakhMatch[1].replace(/,/g, '')) * 100000;

        const kMatch = text.match(/([\d,]+(?:\.\d+)?)\s*(?:k|thousand)\b/i);
        if (kMatch) return parseFloat(kMatch[1].replace(/,/g, '')) * 1000;

        const standardMatch = text.match(/(?:₹|rs\.?|inr|\$|\sfor|\sworth)\s*([\d,]+(?:\.\d+)?)/i) || 
                              text.match(/([\d,]+(?:\.\d+)?)\s*(?:₹|rs\.?|inr|rupees)/i);
        if (standardMatch) return parseFloat(standardMatch[1].replace(/,/g, ''));

        return null;
    };
    const parsedAmount = parseIndianAmount(query);

    // 2. City extraction helper
    const extractCities = (text: string, defaultSrc = 'New Delhi', defaultDest = 'Chandigarh') => {
        const formatCity = (name: string) => {
            const c = name.trim().toLowerCase();
            if (c === 'bangalore' || c === 'bengaluru') return 'Bengaluru';
            if (c === 'hyderabad') return 'Hyderabad';
            if (c === 'jaipur') return 'Jaipur';
            if (c === 'chandigarh') return 'Chandigarh';
            if (c === 'delhi' || c === 'new delhi') return 'Delhi';
            if (c === 'mumbai') return 'Mumbai';
            if (c === 'pune') return 'Pune';
            if (c === 'chennai') return 'Chennai';
            if (c === 'kolkata') return 'Kolkata';
            if (c === 'goa') return 'Goa';
            return name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
        };

        const fromToMatch = text.match(/from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+(?:for|on|at|with|via|worth|in|date|\d+)|$|\.|\,)/i);
        if (fromToMatch) {
            return { source: formatCity(fromToMatch[1]), destination: formatCity(fromToMatch[2]) };
        }
        const toMatch = text.match(/([a-zA-Z]+)\s+to\s+([a-zA-Z]+)/i);
        if (toMatch && !['pay', 'transfer', 'send'].includes(toMatch[1].toLowerCase())) {
            return { source: formatCity(toMatch[1]), destination: formatCity(toMatch[2]) };
        }
        return { source: defaultSrc, destination: defaultDest };
    };

    // 3. Security Checks
    if (lower.includes('deadbeef') || lower.includes('drain') || lower.includes('hacker') || lower.includes('ignore previous')) {
        return {
            domain: 'SECURITY_ATTACK',
            vendor: 'Unauthorized Target (0xDead...Beef)',
            targetAddress: '0x000000000000000000000000000000000000beef',
            amountINR: parsedAmount || 50000,
            delegatedAgentId: 'concierge-08',
            summary: 'Adversarial Prompt Injection Detected',
            actionDesc: 'Unauthorized treasury drain attempt',
            parameters: {},
            missingParameters: [],
            isExceedingPolicy: true,
            requiresApproval: false,
            reasoning: 'Reverted on-chain: recipient target not allowlisted.',
            source: 'local_fallback'
        };
    }

    if (lower.includes('freeze') || lower.includes('halt') || lower.includes('block card')) {
        return {
            domain: 'CARD_FREEZE',
            vendor: 'Visa Card Control Gateway',
            targetAddress: '0x0000000000000000000000000000000000000000',
            amountINR: 0,
            delegatedAgentId: 'concierge-08',
            summary: 'Card Security Freeze Command',
            actionDesc: 'Toggle card freeze status on-chain',
            parameters: {},
            missingParameters: [],
            isExceedingPolicy: false,
            requiresApproval: true,
            reasoning: 'Emergency halt freezes the virtual debit card.',
            source: 'local_fallback'
        };
    }

    // 4. Payroll / Employee Salaries
    if (lower.includes('employee') || lower.includes('employees') || lower.includes('salary') || lower.includes('salaries') || lower.includes('payroll') || lower.includes('stipend')) {
        const amount = parsedAmount || 1000000;
        const employeeMatch = query.match(/(\d+)\s*(?:of\s*my\s*)?employees/i);
        const employeeCount = employeeMatch ? parseInt(employeeMatch[1]) : 5;

        return {
            domain: 'PAYROLL',
            vendor: 'Corporate Payroll Disbursement (RazorpayX)',
            targetAddress: '0x00000000000000000000000000000000000E5E5E',
            amountINR: amount,
            delegatedAgentId: 'finance-07',
            summary: `Disburse monthly payroll to ${employeeCount} employees`,
            actionDesc: `Corporate payroll batch transfer (₹${amount.toLocaleString('en-IN')})`,
            parameters: { employeeCount },
            missingParameters: [
                {
                    key: 'payoutBatch',
                    question: 'Select payroll beneficiary batch:',
                    options: [`Engineering Core (${employeeCount} staff)`, 'Sales & Marketing Team', 'All Fleet Contractors'],
                    default: `Engineering Core (${employeeCount} staff)`
                }
            ],
            isExceedingPolicy: amount > 300000,
            requiresApproval: true,
            reasoning: amount > 300000 ? 'Exceeds single-transaction limit (₹3,00,000). Requires Master TouchID Passkey approval.' : 'In-policy payroll execution.',
            source: 'local_fallback'
        };
    }

    // 5. Train Booking (IRCTC)
    if (lower.includes('train') || lower.includes('irctc') || lower.includes('railway') || lower.includes('railways') || lower.includes('vande bharat') || lower.includes('rajdhani') || lower.includes('shatabdi')) {
        const { source, destination } = extractCities(query, 'Delhi', 'Chandigarh');
        const amount = parsedAmount || 1450.00;

        const hasDate = lower.includes('tomorrow') || lower.includes('today') || lower.includes('monday') || lower.includes('oct') || lower.includes('nov');
        const hasTime = lower.includes('morning') || lower.includes('evening') || lower.includes('night') || lower.includes('am') || lower.includes('pm');

        const missing: any[] = [];
        if (!hasDate) {
            missing.push({
                key: 'travelDate',
                question: 'When would you like to travel?',
                options: ['Tomorrow (25 Oct)', 'Day after tomorrow (26 Oct)', 'Next Monday (27 Oct)'],
                default: 'Tomorrow (25 Oct)'
            });
        }
        if (!hasTime) {
            missing.push({
                key: 'departureTime',
                question: 'Preferred departure time?',
                options: ['Morning Express (06:00 AM)', 'Afternoon Superfast (02:30 PM)', 'Night Sleeper (10:15 PM)'],
                default: 'Morning Express (06:00 AM)'
            });
        }

        return {
            domain: 'TRAVEL_TRAIN',
            vendor: 'Travel & Ticket Booking API (IRCTC Railways)',
            targetAddress: '0x00000000000000000000000000000000000C3C3C',
            amountINR: amount,
            delegatedAgentId: 'concierge-08',
            summary: `IRCTC Express Train (${source} → ${destination})`,
            actionDesc: `IRCTC Express Train Booking (${source} → ${destination})`,
            parameters: { source, destination },
            missingParameters: missing,
            isExceedingPolicy: false,
            requiresApproval: true,
            reasoning: 'Within concierge per-tx budget. Ready for confirmation.',
            source: 'local_fallback'
        };
    }

    // 6. Bus Booking (RedBus)
    if (lower.includes('bus') || lower.includes('redbus') || lower.includes('volvo') || lower.includes('sleeper')) {
        const { source, destination } = extractCities(query, 'Bengaluru', 'Hyderabad');
        const amount = parsedAmount || 1850.00;

        const hasDate = lower.includes('tomorrow') || lower.includes('today') || lower.includes('oct') || lower.includes('nov');
        const missing: any[] = [];
        if (!hasDate) {
            missing.push({
                key: 'travelDate',
                question: 'Select departure date:',
                options: ['Tonight Sleeper (21:45 PM)', 'Tomorrow Night (21:45 PM)', 'This Weekend'],
                default: 'Tomorrow Night (21:45 PM)'
            });
        }

        return {
            domain: 'TRAVEL_BUS',
            vendor: 'RedBus Intercity Mobility',
            targetAddress: '0x00000000000000000000000000000000000F6F6F',
            amountINR: amount,
            delegatedAgentId: 'concierge-08',
            summary: `Intercity Sleeper Bus (${source} → ${destination})`,
            actionDesc: `Intercity luxury sleeper bus booking on RedBus (${source} → ${destination})`,
            parameters: { source, destination },
            missingParameters: missing,
            isExceedingPolicy: false,
            requiresApproval: true,
            reasoning: 'In-policy mobility reservation.',
            source: 'local_fallback'
        };
    }

    // 7. Flight Booking (IndiGo)
    if (lower.includes('flight') || lower.includes('plane') || lower.includes('indigo') || lower.includes('fly')) {
        const { source: fromCity, destination: toCity } = extractCities(query, 'Delhi', 'Bengaluru');
        const amount = parsedAmount || 14500.00;

        const hasDate = lower.includes('tomorrow') || lower.includes('today') || lower.includes('oct') || lower.includes('nov');
        const missing: any[] = [];
        if (!hasDate) {
            missing.push({
                key: 'flightDate',
                question: 'Preferred flight date:',
                options: ['Tomorrow Morning (06:15 AM)', 'Tomorrow Evening (07:30 PM)', 'Flexible Date'],
                default: 'Tomorrow Morning (06:15 AM)'
            });
        }

        return {
            domain: 'TRAVEL_FLIGHT',
            vendor: 'Travel & Ticket Booking API (IndiGo)',
            targetAddress: '0x00000000000000000000000000000000000C3C3C',
            amountINR: amount,
            delegatedAgentId: 'concierge-08',
            summary: `IndiGo Flight (${fromCity} → ${toCity})`,
            actionDesc: `Corporate domestic flight reservation on IndiGo (${fromCity} → ${toCity})`,
            parameters: { source: fromCity, destination: toCity },
            missingParameters: missing,
            isExceedingPolicy: amount > 20000,
            requiresApproval: true,
            reasoning: amount > 20000 ? 'Exceeds concierge limit (₹20,000). Escalates to TouchID Passkey.' : 'In-policy flight reservation.',
            source: 'local_fallback'
        };
    }

    // 8. Grocery (Blinkit)
    const GROCERY_CATALOG = [
        { keywords: ['banana', 'bananas', 'kela'], name: 'Fresh Cavendish Bananas (Robusta 1 Dozen / ~1kg)', price: 60.00 },
        { keywords: ['milk', 'doodh'], name: 'Amul Taaza Homogenised Toned Milk (1L)', price: 75.00 },
        { keywords: ['coffee', 'nescafe', 'blue tokai'], name: 'Blue Tokai Silver Oak Blend Ground Coffee (250g)', price: 470.00 },
        { keywords: ['bread', 'toast'], name: 'Harvest Gold Artisanal Brown Bread (400g)', price: 50.00 },
        { keywords: ['egg', 'eggs', 'anda'], name: 'Farm Fresh White Eggs (Pack of 6)', price: 65.00 },
        { keywords: ['apple', 'apples'], name: 'Fresh Shimla Royal Apples (500g)', price: 120.00 }
    ];
    const matchedGroceryItems = GROCERY_CATALOG.filter(item => item.keywords.some(k => lower.includes(k)))
        .map(i => ({ name: i.name, quantity: 1, price: i.price }));

    if (matchedGroceryItems.length > 0 || ['blinkit', 'zepto', 'grocery', 'groceries', 'pantry'].some(k => lower.includes(k))) {
        const items = matchedGroceryItems.length > 0 ? matchedGroceryItems : [
            { name: 'Amul Taaza Homogenised Toned Milk (1L x 4)', quantity: 4, price: 300.00 },
            { name: 'Blue Tokai Silver Oak Blend Ground Coffee (250g)', quantity: 1, price: 470.00 },
            { name: 'Fresh Cavendish Bananas (Robusta 1kg)', quantity: 1, price: 90.00 }
        ];
        const calculatedTotal = items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
        const amount = parsedAmount || calculatedTotal;
        const itemSummary = items.map(i => i.name.split(' (')[0]).join(', ');

        return {
            domain: 'GROCERY',
            vendor: 'Grocery & Delivery Service (Blinkit/Zepto)',
            targetAddress: '0x00000000000000000000000000000000000B2B2B',
            amountINR: amount,
            delegatedAgentId: 'concierge-08',
            summary: `Blinkit 10-Min Delivery (${itemSummary})`,
            actionDesc: `10-minute quick delivery on Blinkit (${itemSummary})`,
            parameters: { items },
            missingParameters: [],
            isExceedingPolicy: false,
            requiresApproval: true,
            reasoning: 'In-policy micro-procurement.',
            source: 'local_fallback'
        };
    }

    // Default Fallback
    return {
        domain: 'UNKNOWN',
        vendor: 'Corporate Operational Expense',
        targetAddress: '0x00000000000000000000000000000000000C3C3C',
        amountINR: parsedAmount || 1850,
        delegatedAgentId: 'concierge-08',
        summary: query,
        actionDesc: `Operational agent task: ${query}`,
        parameters: {},
        missingParameters: [],
        isExceedingPolicy: false,
        requiresApproval: true,
        reasoning: 'Awaiting explicit owner authorization.',
        source: 'local_fallback'
    };
}
