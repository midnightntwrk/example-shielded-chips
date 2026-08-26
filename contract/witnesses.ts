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

// Private state for the chips example.
//
// Two witnesses, and the difference between them is the whole authorisation model:
//
// - `secretKey` is a secret. The contract never sees it — only `identityOf(sk)`,
//   a domain-separated hash — so holding the secret IS the authorisation. Note what
//   this is *not*: a witness returning an account or address directly would be
//   forgeable, because a witness is the caller's own code and returns whatever the
//   caller chooses.
// - `chipNonce` seeds the minted coin. A nonce reused for the same (value,
//   recipient) produces a duplicate commitment, which the ledger rejects, so it is
//   the caller's job to keep it unique.
import { type WitnessContext } from '@midnight-ntwrk/compact-runtime';
import { type Ledger } from './managed/chips/contract/index.js';

export type ChipsPrivateState = {
    readonly secretKey: Uint8Array;
    readonly chipNonce: Uint8Array;
};

export const createChipsPrivateState = (secretKey: Uint8Array, chipNonce: Uint8Array): ChipsPrivateState => ({
    secretKey,
    chipNonce,
});

export const witnesses = {
    secretKey: ({ privateState }: WitnessContext<Ledger, ChipsPrivateState>): [ChipsPrivateState, Uint8Array] => [
        privateState,
        privateState.secretKey,
    ],
    chipNonce: ({ privateState }: WitnessContext<Ledger, ChipsPrivateState>): [ChipsPrivateState, Uint8Array] => [
        privateState,
        privateState.chipNonce,
    ],
};
