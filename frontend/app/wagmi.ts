import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, foundry } from 'wagmi/chains';
import { http } from 'wagmi';

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID';

export const config = getDefaultConfig({
  appName: 'MiniMakerDAO',
  projectId: walletConnectProjectId,
  chains: [sepolia, foundry],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [foundry.id]: http(),
  },
  ssr: true,
});