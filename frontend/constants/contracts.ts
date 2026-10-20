import vEngineAbiJson from './abi.json';
import dEngineAbiJson from './dEngineAbi.json';

export const VENGINE_ADDRESS = (process.env.NEXT_PUBLIC_VENGINE_ADDRESS ||
  process.env.NEXT_PUBLIC_ENGINE_ADDRESS ||
  '0xf488c53008623f4f080bc9D7CFCB857141dC0577') as `0x${string}`;

export const DENGINE_ADDRESS = (process.env.NEXT_PUBLIC_DENGINE_ADDRESS ||
  '0xf777ea495e843E8f32e4cFF7D6fE0690d4239b8A') as `0x${string}`;

// Aliases for compatibility
export const vEngineAddress = VENGINE_ADDRESS;
export const dEngineAddress = DENGINE_ADDRESS;
export const ENGINE_ADDRESS = VENGINE_ADDRESS;
export const DEngine_ADDRESS = DENGINE_ADDRESS;

// ABIs loaded from verified build artifacts
export const vEngineAbi = vEngineAbiJson;
export const dEngineAbi = dEngineAbiJson;

export const contracts = {
  vEngine: {
    address: VENGINE_ADDRESS,
    abi: vEngineAbi,
  },
  dEngine: {
    address: DENGINE_ADDRESS,
    abi: dEngineAbi,
  },
} as const;

export default contracts;
