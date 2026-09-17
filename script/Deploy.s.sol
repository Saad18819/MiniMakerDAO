// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import { HelperConfig} from "./HelperConfig.s.sol";
import {dEngine} from "../src/dEngineToken.sol";
import {VEngine} from "../src/VaultEngine.sol";

contract deployment is Script{

    function run() external returns(VEngine,HelperConfig,dEngine){
    
    HelperConfig priceAddress = new HelperConfig();
   address ethUsdprice =  priceAddress.addressStore();

   vm.startBroadcast();

  dEngine token = new dEngine();

 VEngine engine = new VEngine(address(token),ethUsdprice);

 token.transferOwnership(address(engine));

// In this deployment script, token.transferOwnership(address(engine)); transfers the administrative control of your dEngine token contract to the deployed VEngine contract.
// It guarantees that nobody (not even you as the developer) can arbitrarily mint dEngine tokens out of thin air.
// Tokens can now only be minted or burned through the audited math and collateral checks programmed inside VEngine.


 vm.stopBroadcast();

 return (engine,priceAddress,token);




    }
}


/*
QUICK LEARNING

We need to call transferOwnership because the person who deploys a contract is not the person who should control its central authority long-term.
When your script runs dEngine token = new dEngine(), the dEngine token contract registers the deployment script's wallet address as its initial owner.

If dEngine relies on OpenZeppelin's Ownable pattern to protect its mint() and burn() functions, only the owner address can invoke them.

Beyond making the system functional, transferring ownership to VEngine protects the system's security.

Preventing Developer Backdoors: If your personal wallet remains the owner of dEngine, you maintain the ability to mint infinite debt tokens to your private address at any point. No investor or user will trust a decentralized protocol where a single developer holds a master key to mint tokens.

Locking the Rules On-Chain: By assigning VEngine as the owner, you enforce that tokens can only ever be minted if a user provides adequate collateral, as governed by VEngine's audited smart contract code.



 */