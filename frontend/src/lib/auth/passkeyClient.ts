import type { OwnerIntent } from './types';
const decode = (value: string): ArrayBuffer => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0)).buffer;
const encode = (value: ArrayBuffer): string => btoa(String.fromCharCode(...Array.from(new Uint8Array(value)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function post(body: unknown) {
    const response = await fetch('/api/owner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Owner verification failed');
    return result;
}
export async function verifyOwnerPasskey(intent: OwnerIntent, register: boolean, ownerPassword?: string): Promise<string | null> {
    if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) throw new Error('Device passkeys require a supported browser on HTTPS or localhost.');
    const options = await post({ action: 'begin', kind: register ? 'register' : 'authenticate', intent, ownerPassword });
    const publicKey = { ...options.publicKey, challenge: decode(options.publicKey.challenge) };
    let credential: PublicKeyCredential | null;
    if (register) {
        publicKey.user = { ...publicKey.user, id: decode(publicKey.user.id) };
        credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null;
    } else {
        publicKey.allowCredentials = publicKey.allowCredentials.map((item: any) => ({ ...item, id: decode(item.id) }));
        credential = await navigator.credentials.get({ publicKey }) as PublicKeyCredential | null;
    }
    if (!credential) throw new Error('Owner verification was cancelled');
    const result: any = { id: credential.id, rawId: encode(credential.rawId), type: credential.type, response: { clientDataJSON: encode(credential.response.clientDataJSON) } };
    if (register) result.response.attestationObject = encode((credential.response as AuthenticatorAttestationResponse).attestationObject);
    else {
        const assertion = credential.response as AuthenticatorAssertionResponse;
        result.response.authenticatorData = encode(assertion.authenticatorData);
        result.response.signature = encode(assertion.signature);
        result.response.userHandle = assertion.userHandle ? encode(assertion.userHandle) : null;
    }
    const verified = await post({ action: 'finish', id: options.id, credential: result, ownerPassword: register ? ownerPassword : undefined });
    return verified.proof || null;
}
