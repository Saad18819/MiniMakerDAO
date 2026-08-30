// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import { HelperConfig} from "./HelperConfig.s.sol";
import {dEngine} from "../src/dEngineToken.sol";
import {VEngine} from "../src/VaultEngine.sol";

contract deployment is Script{

    function run() external returns(VEngine){
    
    HelperConfig priceAddress = new HelperConfig();
   address ethUsdprice =  priceAddress.addressStore();

   vm.startBroadcast();

  dEngine token = new dEngine();

 VEngine engine = new VEngine(address(token),ethUsdprice);

 token.transferOwnership(address(engine));

 vm.stopBroadcast();

 return engine;




    }
}