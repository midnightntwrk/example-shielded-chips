# Example Shielded Chips DApp

A Midnight contract that **takes payment**. A house sells chips: hand over a shielded
coin and get back freshly minted chips of the contract's own token type. Chips move
wallet to wallet like any other shielded coin. Bring them back and the house pays the
stake out again.

## Why this example

The existing examples cover ledger state, commitments and proofs well — `counter`,
`bboard`, `battleship`, `kitties`, `nft` / `nft-zk`, `zkloan` — but none of them moves
a token. Between them they contain no call to `receiveShielded`, `mintShieldedToken`,
`sendShielded`, `receiveUnshielded` or `tokenType`, so a developer asking *"how does my
contract charge for something?"* has no worked answer to read.

This fills that gap in the smallest contract that still shows the whole round trip:
take a coin, bank it, mint against it, pay it back, and gate the till.

## The contract

| circuit | what it demonstrates |
|---|---|
| `chipColor()` | `tokenType(domain, kernel.self())` — a token type bound to this contract's address, so no other deployment can mint a chip this one honours |
| `buyChips(payment, count)` | `receiveShielded` to take the stake, `mergeCoinImmediate` + `insertCoin` to bank it, `mintShieldedToken` to issue chips to the caller |
| `cashOut(chips)` | `sendImmediateShielded` to burn a coin created in this transaction, `sendShielded` to pay from the banked float, and re-banking the change |
| `sweep()` | authority checked against a hash-derived identity |

## Four things worth reading the code for

**1. A coin created in this transaction cannot be spent with `sendShielded`.** It has
no Merkle index yet, so it is a `ShieldedCoinInfo` rather than a
`QualifiedShieldedCoinInfo`. `cashOut` burns the incoming chips with
`sendImmediateShielded` and pays out from the vault — which *is* qualified — with
`sendShielded`.

**2. A contract-initiated mint writes no coin ciphertext.** A wallet cannot discover
the coin by scanning for it, so the `ShieldedCoinInfo` returned from `buyChips` is the
only record that it exists. That is safe here because the recipient is the caller, who
receives the return value from their own transaction. Minting to a *third party* would
strand the value unless the coin info were delivered out of band — worth knowing before
designing an airdrop.

**3. The compiler stops you leaking a correlation.** Paying out an amount derived from
the private chip value refuses to compile:

> the call to standard-library circuit `sendShielded` might disclose a link between a
> coin spend and the coin with the commitment given by a hash of the result of a
> multiplication involving the witness value

Cashing out genuinely does reveal how many chips are being redeemed, so the fix is an
explicit `disclose` on the payout. The leak becomes deliberate and reviewable instead
of silent — which is what `disclose` is for.

**4. Identity is derived, never supplied.** `sweep` compares `identityOf(secretKey())`
against the house id stored at construction. There is no address parameter to lie
about: a witness that returned the caller's *account* would be forgeable, because a
witness is the caller's own code and returns whatever the caller chooses.

## ⚠️ The vault's holdings are public

`takings` is exported ledger state, so the float is readable off-chain in plaintext —
nonce, color, value and Merkle index. "Shielded" describes the token rail, not this
contract's balance: chip transfers between wallets are private, what the house is
holding is not. A contract that must hide its own float has to keep the coin off its
ledger and have the spender supply it at call time.

## Running it

Requires the Compact toolchain (language 0.23; developed against `compactc` 0.31.1).

```bash
npm install
npm run compile      # compile contract/chips.compact -> contract/managed/chips
npm test             # 8 tests, pure simulator: no node, no proof server, no docker
npm run typecheck
```

The tests drive the contract through the compact runtime's circuit simulator, so the
whole example runs offline. `src/chips-simulator.ts` chains the circuit context across
calls and `setPlayer` swaps the acting secret — which is all "who is calling" means
here.
