// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {deployment} from "../script/Deploy.s.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";
import {VEngine} from "../src/VaultEngine.sol";
import {dEngine} from "../src/dEngineToken.sol";


contract VaultTest is Test{

    function setup() public{
       deployment deployScript = new deployment(); 
    }
}
