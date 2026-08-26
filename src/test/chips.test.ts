// This file is part of example-shielded-chips.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { describe, expect, it } from 'vitest';
import { ChipsSimulator } from '../chips-simulator.js';

/** A distinguishable 32-byte value. */
const bytes32 = (tag: number): Uint8Array => Uint8Array.from({ length: 32 }, (_, i) => (i === 0 ? tag : 0));

const HOUSE = bytes32(0x01);
const ALICE = bytes32(0xa1);
const MALLORY = bytes32(0xbb);
/** `nativeToken()` — NIGHT is the zero color. */
const NIGHT = new Uint8Array(32);
const PRICE = 5n;

const newHouse = (): ChipsSimulator => new ChipsSimulator(HOUSE, NIGHT, PRICE);

const coin = (nonce: number, color: Uint8Array, value: bigint) => ({ nonce: bytes32(nonce), color, value });

describe('the house', () => {
    it('opens with its price and no chips issued', () => {
        const sim = newHouse();
        expect(sim.getLedger().pricePerChip).toBe(PRICE);
        expect(sim.getLedger().chipsIssued).toBe(0n);
        expect(sim.getLedger().takings.member(NIGHT)).toBe(false);
    });

    it('mints a chip color only it can issue', () => {
        const sim = newHouse();
        const color = sim.call('chipColor').result as Uint8Array;
        // tokenType(domain, kernel.self()) — bound to this contract's address, so a
        // different deployment cannot mint a chip this one would honour.
        expect(color).toHaveLength(32);
        expect(color).not.toEqual(NIGHT);
    });
});

describe('buying chips', () => {
    it('takes the stake and mints chips to the buyer', () => {
        const sim = newHouse();
        sim.setPlayer(ALICE, bytes32(0x10));

        const chips = sim.call('buyChips', coin(0x77, NIGHT, 50n), 10n).result as {
            nonce: Uint8Array;
            color: Uint8Array;
            value: bigint;
        };

        expect(chips.value).toBe(10n);
        expect(sim.getLedger().chipsIssued).toBe(10n);
        // The stake is now banked in the contract's vault.
        expect(sim.getLedger().takings.lookup(NIGHT).value).toBe(50n);
    });

    it('refuses the wrong currency', () => {
        const sim = newHouse();
        sim.setPlayer(ALICE, bytes32(0x10));
        expect(() => sim.call('buyChips', coin(0x77, bytes32(0xee), 50n), 10n)).toThrow(/wrong currency/);
    });

    it('refuses an underpayment', () => {
        const sim = newHouse();
        sim.setPlayer(ALICE, bytes32(0x10));
        expect(() => sim.call('buyChips', coin(0x77, NIGHT, 49n), 10n)).toThrow(/underpaid/);
    });
});

describe('cashing out', () => {
    it('burns the chips and pays the stake back', () => {
        const sim = newHouse();
        sim.setPlayer(ALICE, bytes32(0x10));
        const chips = sim.call('buyChips', coin(0x77, NIGHT, 50n), 10n).result as { nonce: Uint8Array; color: Uint8Array };

        sim.call('cashOut', { nonce: chips.nonce, color: chips.color, value: 4n });

        expect(sim.getLedger().chipsIssued).toBe(6n);
        // 4 chips at 5 apiece leaves 30 of the original 50 in the vault.
        expect(sim.getLedger().takings.lookup(NIGHT).value).toBe(30n);
    });

    it('refuses a coin that is not a chip of this house', () => {
        const sim = newHouse();
        sim.setPlayer(ALICE, bytes32(0x10));
        sim.call('buyChips', coin(0x77, NIGHT, 50n), 10n);
        expect(() => sim.call('cashOut', coin(0x99, bytes32(0xcc), 4n))).toThrow(/not a chip of this house/);
    });
});

describe('the till', () => {
    it('is swept by the house and nobody else', () => {
        const sim = newHouse();
        sim.setPlayer(ALICE, bytes32(0x10));
        sim.call('buyChips', coin(0x77, NIGHT, 50n), 10n);

        // Identity is derived from the secret, so Mallory cannot claim to be the
        // house — there is no address parameter for her to lie about.
        sim.setPlayer(MALLORY, bytes32(0x20));
        expect(() => sim.call('sweep')).toThrow(/not the house/);
        expect(sim.getLedger().takings.member(NIGHT)).toBe(true);

        sim.setPlayer(HOUSE, bytes32(0x30));
        sim.call('sweep');
        expect(sim.getLedger().takings.member(NIGHT)).toBe(false);
    });
});
