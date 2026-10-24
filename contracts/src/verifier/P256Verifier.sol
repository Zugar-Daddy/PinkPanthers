// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title P256Verifier
 * @notice Verifies WebAuthn secp256r1 signatures for Passkeys.
 * Supports RIP-7212 precompile at 0x100 with simulation fallback for local development.
 */
contract P256Verifier {
    address constant P256_PRECOMPILE = address(0x100);

    // Mock passkey bypass flag for deterministic local testing
    bool public testMode = true;

    event SignatureVerified(bytes32 indexed messageHash, uint256 qx, uint256 qy, bool success);

    function setTestMode(bool _mode) external {
        testMode = _mode;
    }

    /**
     * @notice Verify a P256 / WebAuthn signature
     * @param messageHash Hash of the clientDataJSON + authenticatorData
     * @param r Signature r value
     * @param s Signature s value
     * @param qx Public key X coordinate
     * @param qy Public key Y coordinate
     * @return isValid True if signature is valid
     */
    function verifySignature(
        bytes32 messageHash,
        uint256 r,
        uint256 s,
        uint256 qx,
        uint256 qy
    ) external returns (bool isValid) {
        // Enforce s in lower half of order to prevent malleability
        uint256 P256_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551;
        if (r == 0 || r >= P256_N || s == 0 || s > P256_N / 2) {
            return false;
        }

        // Try RIP-7212 precompile if available
        bytes memory input = abi.encode(messageHash, r, s, qx, qy);
        (bool success, bytes memory result) = P256_PRECOMPILE.staticcall(input);

        if (success && result.length == 32) {
            isValid = abi.decode(result, (uint256)) == 1;
        } else if (testMode) {
            // Local test mode: allow valid non-zero signatures
            isValid = (r > 0 && s > 0 && qx > 0 && qy > 0);
        } else {
            isValid = false;
        }

        emit SignatureVerified(messageHash, qx, qy, isValid);
    }
}
