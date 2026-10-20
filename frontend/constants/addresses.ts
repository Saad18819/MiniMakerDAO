export const ENGINE_ADDRESS = (process.env.NEXT_PUBLIC_VENGINE_ADDRESS ||
  process.env.NEXT_PUBLIC_ENGINE_ADDRESS ||
  '0xf488c53008623f4f080bc9D7CFCB857141dC0577') as `0x${string}`;

export const DEngine_ADDRESS = (process.env.NEXT_PUBLIC_DENGINE_ADDRESS ||
  '0xf777ea495e843E8f32e4cFF7D6fE0690d4239b8A') as `0x${string}`;

export const VENGINE_ADDRESS = ENGINE_ADDRESS;
export const DENGINE_ADDRESS = DEngine_ADDRESS;
