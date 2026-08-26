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

// A testbed that chains the circuit context across calls, so a test can play a
// whole session — buy, transfer, cash out — against one piece of contract state.
//
// `setPlayer` is what makes the authorisation model visible: every circuit reads
// its caller identity from the `secretKey` witness, so switching the secret is
// exactly what switching player means. Nothing else changes.
import {
    type CircuitContext,
    type CircuitResults,
    createCircuitContext,
    createConstructorContext,
    sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import { sampleCoinPublicKey } from '@midnight-ntwrk/ledger-v8';
import { Contract, type Ledger, ledger } from '../contract/managed/chips/contract/index.js';
import { type ChipsPrivateState, witnesses } from '../contract/witnesses.js';

export class ChipsSimulator {
    readonly contract: Contract<ChipsPrivateState>;
    private context: CircuitContext<ChipsPrivateState>;
    private state: ChipsPrivateState;

    constructor(houseSecretKey: Uint8Array, priceColor: Uint8Array, pricePerChip: bigint) {
        this.state = { secretKey: houseSecretKey, chipNonce: new Uint8Array(32) };
        // The witnesses read from this object, so reassigning it is how the
        // simulator changes who is calling.
        const live = () => this.state;
        this.contract = new Contract<ChipsPrivateState>({
            secretKey: (ctx) => [ctx.privateState, live().secretKey],
            chipNonce: (ctx) => [ctx.privateState, live().chipNonce],
        } as typeof witnesses);

        const coinPublicKey = sampleCoinPublicKey();
        const built = this.contract.initialState(
            createConstructorContext(this.state, coinPublicKey),
            priceColor,
            pricePerChip,
        );
        this.context = createCircuitContext(
            sampleContractAddress(),
            coinPublicKey,
            built.currentContractState,
            built.currentPrivateState,
        );
    }

    /** Act as somebody else from here on. */
    setPlayer(secretKey: Uint8Array, chipNonce: Uint8Array): void {
        this.state = { secretKey, chipNonce };
    }

    call<K extends keyof Contract<ChipsPrivateState>['impureCircuits']>(
        circuitId: K,
        ...args: unknown[]
    ): CircuitResults<ChipsPrivateState, unknown> {
        const circuit = this.contract.impureCircuits[circuitId] as (
            ctx: CircuitContext<ChipsPrivateState>,
            ...rest: unknown[]
        ) => CircuitResults<ChipsPrivateState, unknown>;
        const results = circuit(this.context, ...args);
        this.context = results.context;
        return results;
    }

    getLedger(): Ledger {
        return ledger(this.context.currentQueryContext.state);
    }
}
