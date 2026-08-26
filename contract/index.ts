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

// Re-exports the compiled contract and its witnesses.
//
// Deploying this from a DApp additionally needs the `@midnight-ntwrk/midnight-js-*`
// providers; the tests here drive the contract through the compact runtime's
// simulator instead, so the example runs with no node and no proof server.
export {
    Contract,
    ledger,
    pureCircuits,
    type Witnesses,
    type Ledger,
    type ImpureCircuits,
    type PureCircuits,
} from './managed/chips/contract/index.js';

export { witnesses, createChipsPrivateState, type ChipsPrivateState } from './witnesses.js';
