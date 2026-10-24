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
        source: string = 'Bengaluru (Kempegowda BS)',
        destination: string = 'Hyderabad (MGBS)',
        amount: number = 1850.00,
        passengerName: string = 'Madhav B. / SafeAgent Ops'
    ): RedBusTicket {
        const pnrNumber = `RB-${Math.floor(100000 + Math.random() * 900000)}`;
        const operators = ['IntrCity SmartBus', 'KPN Travels Premium', 'SRS Travels Multi-Axle', 'VRL Travels A/C Sleeper'];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        const seats = ['14A (Single Sleeper)', '14B (Window)'];

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const departureDate = tomorrow.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        return {
            type: 'REDBUS',
            pnr: pnrNumber,
            operator,
            busType: 'Volvo 9600 Multi-Axle A/C Sleeper (2+1)',
            source,
            destination,
            seatNumbers: seats,
            boardingPoint: 'Madiwala Silk Board Junction, Gate #2',
            boardingTime: '21:45 PM IST',
            departureDate,
            amount,
            passengerName,
            status: 'CONFIRMED'
        };
    }

    static generateIndigoTicket(
        fromCity: string = 'Delhi (DEL)',
        toCity: string = 'Bengaluru (BLR)',
        amount: number = 14500.00,
        passengerName: string = 'Madhav B. / SafeAgent Executive'
    ): IndigoFlightTicket {
        const pnrNumber = `6E-${Math.floor(1000 + Math.random() * 9000)}`;
        const flightNumbers = ['6E-2041', '6E-5512', '6E-809', '6E-198'];
        const flightNumber = flightNumbers[Math.floor(Math.random() * flightNumbers.length)];

        return {
            type: 'INDIGO',
            pnr: pnrNumber,
            flightNumber,
            fromAirport: 'Indira Gandhi Intl (DEL)',
            toAirport: 'Kempegowda Intl (BLR)',
            fromCity,
            toCity,
            departureTime: '06:15 AM IST (Tomorrow)',
            gate: 'Gate 42B',
            terminal: 'Terminal 3',
            seat: '12C (Aisle / Extra Legroom)',
            fareClass: amount > 10000 ? 'Corporate Executive' : 'Economy Flex',
            passengerName,
            amount,
            status: 'TICKETED'
        };
    }

    static generateBlinkitOrder(
        amount: number = 950.00
    ): BlinkitOrder {
        const orderId = `BK-${Math.floor(10000 + Math.random() * 90000)}`;
        const items = [
            { name: 'Amul Taaza Homogenised Toned Milk (1L x 4)', quantity: 4, price: 300.00 },
            { name: 'Blue Tokai Silver Oak Blend Ground Coffee (250g)', quantity: 1, price: 470.00 },
            { name: 'Fresh Cavendish Bananas (Robusta 1kg)', quantity: 1, price: 90.00 },
            { name: 'Paper Napkins & Wooden Stirrers Pack', quantity: 1, price: 90.00 }
        ];

        return {
            type: 'BLINKIT',
            orderId,
            items,
            deliveryAddress: 'SafeAgent Labs, HSR Layout Sector 4, Bengaluru - 560102',
            etaMinutes: 9,
            riderName: 'Sunil Gowda (ID: #4401)',
            amount,
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
