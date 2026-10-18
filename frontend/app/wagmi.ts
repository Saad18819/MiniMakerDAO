import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, foundry } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'MiniMakerDAO',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Replace with your Project ID from cloud.walletconnect.com (or leave placeholder for local test)
  chains: [foundry, sepolia],
});