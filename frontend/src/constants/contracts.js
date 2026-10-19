import vEngineArtifact from '../../../out/VaultEngine.sol/VEngine.json';
import dEngineArtifact from '../../../out/dEngineToken.sol/dEngine.json';

export const VENGINE_ADDRESS = '0xf488c53008623f4f080bc9D7CFCB857141dC0577';
export const DENGINE_ADDRESS = '0xf777ea495e843E8f32e4cFF7D6fE0690d4239b8A';

// Aliases for compatibility
export const vEngineAddress = VENGINE_ADDRESS;
export const dEngineAddress = DENGINE_ADDRESS;
export const ENGINE_ADDRESS = VENGINE_ADDRESS;
export const DEngine_ADDRESS = DENGINE_ADDRESS;

// ABIs loaded from Foundry build artifacts
export const vEngineAbi = vEngineArtifact.abi;
export const dEngineAbi = dEngineArtifact.abi;

export { vEngineArtifact, dEngineArtifact };

export const contracts = {
  vEngine: {
    address: VENGINE_ADDRESS,
    abi: vEngineAbi,
  },
  dEngine: {
    address: DENGINE_ADDRESS,
    abi: dEngineAbi,
  },
};

export default contracts;
