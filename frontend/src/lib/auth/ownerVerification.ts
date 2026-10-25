import { createHash, createPublicKey, randomBytes, randomUUID, timingSafeEqual, verify } from 'crypto';
import { readWalletState, writeWalletState, withWalletStateLock, WalletState } from '../state/walletStore';
import { normalizeIntent, intentHash } from './ownerApproval';
export { normalizeIntent, consumeOwnerApproval } from './ownerApproval';
import type { OwnerSecurity } from './types';
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const security = (state: WalletState): OwnerSecurity => state.ownerSecurity ||= { challenges: [], approvals: [] };
function bytes(value: unknown, max = 32000): Buffer {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > max) throw new Error('Invalid passkey response encoding');
    return Buffer.from(value, 'base64url');
}
export function ownerStatus(origin: string) {
    const credential = readWalletState().ownerSecurity?.credential;
    return { registered: !!credential, rpId: credential?.rpId, originMatches: !credential || credential.rpId === new URL(origin).hostname };
}
function checkOrigin(origin: string) {
    const url = new URL(origin);
    if (url.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Passkeys require HTTPS or localhost');
    if (process.env.WEBAUTHN_ORIGIN && origin !== new URL(process.env.WEBAUTHN_ORIGIN).origin) throw new Error('Unexpected passkey origin');
    return url.hostname;
}
function ownerPassword(password: unknown) {
    const expected = process.env.WALLET_ADMIN_TOKEN;
    if (!expected || expected.length < 32 || typeof password !== 'string' || !timingSafeEqual(Buffer.from(hash(password)), Buffer.from(hash(expected)))) throw new Error('The owner setup password is incorrect. Use your configured dashboard owner password.');
}
export function beginVerification(origin: string, kind: 'register' | 'authenticate', input?: unknown, password?: unknown) {
    const rpId = checkOrigin(origin);
    return withWalletStateLock(() => {
        const state = readWalletState(); const auth = security(state);
        if (kind === 'register') {
            if (auth.credential) throw new Error('An owner passkey is already registered. Use the original site and passkey.');
            ownerPassword(password);
        } else if (!auth.credential || auth.credential.rpId !== rpId) throw new Error('Set up the owner passkey on this site first, or open its original hostname.');
        const intent = kind === 'authenticate' ? normalizeIntent(input) : undefined;
        if ((intent?.kind === 'policy_update' || intent?.kind === 'card_limit') && intent.agentId !== state.activeAgent.id) throw new Error('Selected agent changed. Reopen policy settings.');
        const id = randomUUID(); const challenge = randomBytes(32).toString('base64url');
        const userId = auth.credential?.userId || randomBytes(32).toString('base64url');
        auth.challenges = auth.challenges.filter(c => c.expiresAt > Date.now()).slice(-19);
        auth.challenges.push({ id, challenge, type: kind, rpId, origin, expiresAt: Date.now() + 120000, intent, userId });
        writeWalletState(state);
        return kind === 'register' ? { id, publicKey: { challenge, rp: { id: rpId, name: 'SafeAgent Treasury' }, user: { id: userId, name: 'treasury-owner', displayName: 'Treasury owner' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }], timeout: 120000, attestation: 'none', authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' } } } : { id, publicKey: { challenge, rpId, allowCredentials: [{ type: 'public-key', id: auth.credential!.id }], userVerification: 'required', timeout: 120000 } };
    });
}
// Definite-length CBOR subset used by WebAuthn attestation objects and ES256 COSE keys.
function cbor(data: Buffer, start = 0): { value: any; end: number } {
    let offset = start;
    const read = (depth: number): any => {
        if (depth > 10 || offset >= data.length) throw new Error('Invalid passkey CBOR');
        const initial = data[offset++]; const major = initial >> 5; const ai = initial & 31;
        let length = ai;
        if (ai >= 24) {
            const size = ai === 24 ? 1 : ai === 25 ? 2 : ai === 26 ? 4 : 0;
            if (!size || offset + size > data.length) throw new Error('Unsupported passkey CBOR');
            length = data.readUIntBE(offset, size); offset += size;
        }
        if (length > 32000) throw new Error('Passkey response too large');
        if (major === 0) return length;
        if (major === 1) return -1 - length;
        if (major === 2 || major === 3) {
            if (offset + length > data.length) throw new Error('Truncated passkey response');
            const value = data.subarray(offset, offset + length); offset += length;
            return major === 2 ? value : value.toString('utf8');
        }
        if (major === 4) return Array.from({ length }, () => read(depth + 1));
        if (major === 5) {
            const map = new Map();
            for (let i = 0; i < length; i++) { const key = read(depth + 1); if (map.has(key)) throw new Error('Duplicate CBOR key'); map.set(key, read(depth + 1)); }
            return map;
        }
        if (major === 7 && ai === 20) return false;
        if (major === 7 && ai === 21) return true;
        if (major === 7 && ai === 22) return null;
        throw new Error('Unsupported passkey CBOR value');
    };
    return { value: read(0), end: offset };
}
function validateClient(data: Buffer, challenge: OwnerSecurity['challenges'][number], type: string) {
    const client = JSON.parse(data.toString('utf8'));
    if (client.type !== type || client.challenge !== challenge.challenge || client.origin !== challenge.origin || client.crossOrigin === true || client.topOrigin) throw new Error('Passkey challenge or origin did not match');
}
function validateAuth(data: Buffer, rpId: string) {
    if (data.length < 37 || data.subarray(0,32).toString('hex') !== hash(rpId) || (data[32] & 5) !== 5) throw new Error('Device user verification is required');
    if ((data[32] & 16) && !(data[32] & 8)) throw new Error('Invalid authenticator backup flags');
    return data.readUInt32BE(33);
}
export function completeVerification(origin: string, challengeId: string, response: any, setupPassword?: unknown) {
    checkOrigin(origin);
    return withWalletStateLock(() => {
        const state = readWalletState(); const auth = security(state);
        const challenge = auth.challenges.find(c => c.id === challengeId && c.origin === origin && c.expiresAt > Date.now());
        if (!challenge) throw new Error('Owner verification expired or was already used. Try again.');
        if (response?.type !== 'public-key') throw new Error('Invalid passkey type');
        const rawId = bytes(response.rawId, 2048);
        if (!rawId.length || rawId.length > 1023) throw new Error('Invalid credential identifier length');
        if (rawId.toString('base64url') !== response.id) throw new Error('Invalid credential identifier');
        const clientData = bytes(response.response?.clientDataJSON);
        validateClient(clientData, challenge, challenge.type === 'register' ? 'webauthn.create' : 'webauthn.get');
        if (challenge.type === 'register') {
            ownerPassword(setupPassword);
            if (auth.credential) throw new Error('Owner passkey was already registered');
            const attestationBytes = bytes(response.response?.attestationObject);
            const attestation = cbor(attestationBytes);
            if (attestation.end !== attestationBytes.length || !(attestation.value instanceof Map) || attestation.value.get('fmt') !== 'none' || !(attestation.value.get('attStmt') instanceof Map) || attestation.value.get('attStmt').size !== 0) throw new Error('Expected privacy-preserving passkey registration');
            const authData = attestation.value.get('authData');
            if (!Buffer.isBuffer(authData)) throw new Error('Missing registration authenticator data');
            const counter = validateAuth(authData, challenge.rpId);
            if (!(authData[32] & 64) || authData.length < 55) throw new Error('Missing attested credential data');
            const length = authData.readUInt16BE(53);
            if (length !== rawId.length || !authData.subarray(55,55+length).equals(rawId)) throw new Error('Credential identifier mismatch');
            const parsedKey = cbor(authData,55+length);
            let end = parsedKey.end;
            if (authData[32] & 128) {
                const extensions = cbor(authData, end);
                if (!(extensions.value instanceof Map)) throw new Error('Invalid authenticator extensions');
                end = extensions.end;
            }
            if (end !== authData.length) throw new Error('Unexpected registration authenticator data');
            const key = parsedKey.value;
            if (!(key instanceof Map) || key.get(1) !== 2 || key.get(3) !== -7 || key.get(-1) !== 1 || !Buffer.isBuffer(key.get(-2)) || key.get(-2).length !== 32 || !Buffer.isBuffer(key.get(-3)) || key.get(-3).length !== 32) throw new Error('An ES256 platform passkey is required');
            const publicKey = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: key.get(-2).toString('base64url'), y: key.get(-3).toString('base64url') }, format: 'jwk' }).export({ format: 'pem', type: 'spki' }).toString();
            auth.credential = { id: response.id, publicKey, counter, rpId: challenge.rpId, userId: challenge.userId };
            state.principal.passkeyEnabled = true; state.principal.passkeyCredentialId = response.id; state.principal.passkeyDeviceName = 'Verified owner platform passkey';
            auth.challenges = []; writeWalletState(state);
            return { registered: true };
        }
        const credential = auth.credential;
        if (!credential || credential.id !== response.id || credential.rpId !== challenge.rpId) throw new Error('This is not the registered owner passkey');
        if (response.response.userHandle && bytes(response.response.userHandle).toString('base64url') !== credential.userId) throw new Error('Wrong passkey user');
        const authenticatorData = bytes(response.response.authenticatorData);
        const counter = validateAuth(authenticatorData, challenge.rpId);
        if (authenticatorData[32] & 64) throw new Error('Unexpected attestation in assertion');
        if (authenticatorData[32] & 128) {
            const extensions = cbor(authenticatorData, 37);
            if (!(extensions.value instanceof Map) || extensions.end !== authenticatorData.length) throw new Error('Invalid authenticator extensions');
        } else if (authenticatorData.length !== 37) throw new Error('Unexpected assertion authenticator data');
        if ((counter !== 0 || credential.counter !== 0) && counter <= credential.counter) throw new Error('Passkey counter did not advance');
        const signed = Buffer.concat([authenticatorData, createHash('sha256').update(clientData).digest()]);
        if (!verify('sha256', signed, credential.publicKey, bytes(response.response.signature, 1024))) throw new Error('Owner passkey signature verification failed');
        credential.counter = counter;
        auth.challenges = auth.challenges.filter(c => c.id !== challenge.id);
        const proof = randomBytes(32).toString('base64url');
        auth.approvals = auth.approvals.filter(a => !a.used && a.expiresAt > Date.now()).slice(-19);
        auth.approvals.push({ hash: hash(proof), intentHash: intentHash(challenge.intent!), expiresAt: Date.now()+60000 });
        writeWalletState(state);
        return { proof };
    });
}
