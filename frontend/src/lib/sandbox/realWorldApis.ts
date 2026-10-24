/**
 * Real-World API Sandbox Service for SafeAgent Treasury
 * Simulates high-fidelity production responses from RedBus, IndiGo, Blinkit, AWS, and OpenAI.
 */

export interface RedBusTicket {
    type: 'REDBUS';
    pnr: string;
    operator: string;
    busType: string;
    source: string;
    destination: string;
    seatNumbers: string[];
    boardingPoint: string;
    boardingTime: string;
    departureDate: string;
    amount: number;
    passengerName: string;
    status: 'CONFIRMED' | 'CANCELLED';
    ticketUrl?: string;
}

export interface IndigoFlightTicket {
    type: 'INDIGO';
    pnr: string;
    flightNumber: string;
    fromAirport: string;
    toAirport: string;
    fromCity: string;
    toCity: string;
    departureTime: string;
    gate: string;
    terminal: string;
    seat: string;
    fareClass: 'Economy Flex' | 'Corporate Executive' | 'Super Saver';
    passengerName: string;
    amount: number;
    status: 'TICKETED';
}

export interface BlinkitOrder {
    type: 'BLINKIT';
    orderId: string;
    items: { name: string; quantity: number; price: number }[];
    deliveryAddress: string;
    etaMinutes: number;
    riderName: string;
    amount: number;
    status: 'DISPATCHED' | 'DELIVERED';
}

export interface AwsCloudInvoice {
    type: 'AWS';
    invoiceNumber: string;
    accountId: string;
    service: string;
    region: string;
    creditsPurchased: number;
    amount: number;
    billingPeriod: string;
    status: 'PAID';
}

export interface OpenAiInvoice {
    type: 'OPENAI';
    invoiceNumber: string;
    organizationId: string;
    inferenceTokensAllocated: string;
    tier: string;
    amount: number;
    status: 'PAID';
}

export type RealWorldArtifact = 
    | RedBusTicket 
    | IndigoFlightTicket 
    | BlinkitOrder 
    | AwsCloudInvoice 
    | OpenAiInvoice;

/**
 * Real-World Mock API Dispatcher
 */
export class RealWorldApiGateway {
    static generateRedBusTicket(
        source: string = 'Bengaluru',
        destination: string = 'Hyderabad',
        amount: number = 1850.00,
        passengerName: string = 'Madhav B. / SafeAgent Ops'
    ): RedBusTicket {
        const pnrNumber = `RB-${Math.floor(100000 + Math.random() * 900000)}`;
        const operators = ['IntrCity SmartBus', 'KPN Travels Premium', 'SRS Travels Multi-Axle', 'VRL Travels A/C Sleeper', 'Zingbus Electric'];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        const seats = ['14A (Single Sleeper)', '14B (Window)'];

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const departureDate = tomorrow.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        // Dynamic boarding point based on source city
        const srcLower = source.toLowerCase();
        let boardingPoint = `${source} Central Bus Terminal, Platform 1`;
        if (srcLower.includes('jaipur')) boardingPoint = 'Sindhi Camp Central Bus Stand, Platform 4';
        else if (srcLower.includes('chandigarh')) boardingPoint = 'ISBT Sector 43, Gate #3';
        else if (srcLower.includes('bangalore') || srcLower.includes('bengaluru')) boardingPoint = 'Madiwala Silk Board Junction, Gate #2';
        else if (srcLower.includes('hyderabad')) boardingPoint = 'MGBS Central Bus Station, Bay 6';
        else if (srcLower.includes('delhi')) boardingPoint = 'Kashmere Gate ISBT, Gate 1';
        else if (srcLower.includes('mumbai')) boardingPoint = 'Borivali West, Gokul Hotel Junction';
        else if (srcLower.includes('pune')) boardingPoint = 'Swargate Bus Station, Platform 2';

        return {
            type: 'REDBUS',
            pnr: pnrNumber,
            operator,
            busType: 'Volvo 9600 Multi-Axle A/C Sleeper (2+1)',
            source,
            destination,
            seatNumbers: seats,
            boardingPoint,
            boardingTime: '21:45 PM IST',
            departureDate,
            amount,
            passengerName,
            status: 'CONFIRMED'
        };
    }

    static generateIndigoTicket(
        fromCity: string = 'Delhi',
        toCity: string = 'Bengaluru',
        amount: number = 14500.00,
        passengerName: string = 'Madhav B. / SafeAgent Executive'
    ): IndigoFlightTicket {
        const pnrNumber = `6E-${Math.floor(1000 + Math.random() * 9000)}`;
        const flightNumbers = ['6E-2041', '6E-5512', '6E-809', '6E-198', '6E-344'];
        const flightNumber = flightNumbers[Math.floor(Math.random() * flightNumbers.length)];

        const getAirport = (city: string) => {
            const c = city.toLowerCase();
            if (c.includes('delhi')) return 'Indira Gandhi Intl (DEL)';
            if (c.includes('bengaluru') || c.includes('bangalore')) return 'Kempegowda Intl (BLR)';
            if (c.includes('mumbai') || c.includes('bombay')) return 'Chhatrapati Shivaji Maharaj Intl (BOM)';
            if (c.includes('jaipur')) return 'Jaipur Intl (JAI)';
            if (c.includes('chandigarh')) return 'Shaheed Bhagat Singh Intl (IXC)';
            if (c.includes('hyderabad')) return 'Rajiv Gandhi Intl (HYD)';
            if (c.includes('chennai') || c.includes('madras')) return 'Chennai Intl (MAA)';
            if (c.includes('kolkata') || c.includes('calcutta')) return 'Netaji Subhash Chandra Bose Intl (CCU)';
            if (c.includes('goa')) return 'Goa Dabolim / Mopa (GOX)';
            if (c.includes('pune')) return 'Pune International (PNQ)';
            return `${city} Domestic Airport`;
        };

        return {
            type: 'INDIGO',
            pnr: pnrNumber,
            flightNumber,
            fromAirport: getAirport(fromCity),
            toAirport: getAirport(toCity),
            fromCity,
            toCity,
            departureTime: '06:15 AM IST (Tomorrow)',
            gate: 'Gate 42B',
            terminal: 'Terminal 3',
            seat: '12C (Aisle / Extra Legroom)',
            fareClass: amount > 20000 ? 'Corporate Executive' : 'Economy Flex',
            passengerName,
            amount,
            status: 'TICKETED'
        };
    }

    static generateBlinkitOrder(
        amount?: number,
        customItems?: { name: string; quantity: number; price: number }[],
        deliveryAddress?: string
    ): BlinkitOrder {
        const orderId = `BK-${Math.floor(10000 + Math.random() * 90000)}`;
        const items = customItems && customItems.length > 0 ? customItems : [
            { name: 'Amul Taaza Homogenised Toned Milk (1L x 4)', quantity: 4, price: 300.00 },
            { name: 'Blue Tokai Silver Oak Blend Ground Coffee (250g)', quantity: 1, price: 470.00 },
            { name: 'Fresh Cavendish Bananas (Robusta 1kg)', quantity: 1, price: 90.00 },
            { name: 'Paper Napkins & Wooden Stirrers Pack', quantity: 1, price: 90.00 }
        ];
        const total = amount !== undefined ? amount : items.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);

        return {
            type: 'BLINKIT',
            orderId,
            items,
            deliveryAddress: deliveryAddress || 'SafeAgent Labs, HSR Layout Sector 4, Bengaluru - 560102',
            etaMinutes: Math.floor(7 + Math.random() * 5),
            riderName: 'Sunil Gowda (ID: #4401)',
            amount: total,
            status: 'DISPATCHED'
        };
    }

    static generateAwsInvoice(
        amount: number = 2200.00
    ): AwsCloudInvoice {
        const invoiceNumber = `INV-AWS-${Math.floor(100000 + Math.random() * 900000)}`;
        return {
            type: 'AWS',
            invoiceNumber,
            accountId: '4920-1849-0192',
            service: 'Amazon EC2 / Lambda Serverless Edge Units',
            region: 'ap-south-1 (Mumbai)',
            creditsPurchased: Math.round(amount * 1.15),
            amount,
            billingPeriod: `${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} Usage`,
            status: 'PAID'
        };
    }

    static generateOpenAiInvoice(
        amount: number = 1500.00
    ): OpenAiInvoice {
        const invoiceNumber = `INV-OAI-${Math.floor(100000 + Math.random() * 900000)}`;
        return {
            type: 'OPENAI',
            invoiceNumber,
            organizationId: 'org-safeagent-treasury-corp',
            inferenceTokensAllocated: `${(amount * 12500).toLocaleString('en-IN')} Tokens (GPT-4o & Claude 3.5)`,
            tier: 'Usage Tier 4 Enterprise',
            amount,
            status: 'PAID'
        };
    }
}
