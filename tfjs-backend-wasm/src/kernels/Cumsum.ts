/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {Cumsum, CumsumAttrs, CumsumInputs, NamedAttrMap, NamedTensorInfoMap, registerKernel, TensorInfo} from '@tensorflow/tfjs-core';

import {BackendWasm} from '../backend_wasm';

let wasmCumsum: (
    xId: number, exclusive: number, reverse: number, finalDim: number,
    outId: number) => void;

function setup(backend: BackendWasm) {
  wasmCumsum = backend.wasm.cwrap(Cumsum, null /* void */, [
    'number',  // x_id
    'number',  // exclusive
    'number',  // reverse
    'number',  // final_dim
    'number'   // out_id
  ]);
}

function cumsum(args: {
  backend: BackendWasm,
  inputs: NamedTensorInfoMap,
  attrs: NamedAttrMap
}): TensorInfo {
  const {inputs, backend, attrs} = args;
  const {x} = inputs as {} as CumsumInputs;
  const {axis, exclusive, reverse} = attrs as {} as CumsumAttrs;
  const xRank = x.shape.length;
  if (axis !== xRank - 1) {
    throw new Error(
        `WASM cumsum expects an inner-most axis=${xRank - 1} ` +
        `but got axis=${axis}`);
  }
  const out = backend.makeOutput(x.shape, 'int32');
  const xId = backend.dataIdMap.get(x.dataId).id;
  const outId = backend.dataIdMap.get(out.dataId).id;
  const finalDim = x.shape[xRank - 1];
  wasmCumsum(xId, exclusive ? 1 : 0, reverse ? 1 : 0, finalDim, outId);
  return out;
}

registerKernel({
  kernelName: Cumsum,
  backendName: 'wasm',
  setupFunc: setup,
  kernelFunc: cumsum
});
