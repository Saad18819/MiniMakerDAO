// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;



import {Test} from "forge-std/Test.sol";
import {deployment} from "../../script/Deploy.s.sol";
import {HelperConfig} from "../../script/Deploy.s.sol";
import {dEngine} from "../../src/dEngineToken.sol";
import {VEngine} from "../../src/VaultEngine.sol";
import {MockV3Aggregator} from "./MockV3Aggregator.sol"; 
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";


contract integration is Test{

dEngine eng;
HelperConfig config;
 MockV3Aggregator mockPriceFeed;



    function setup() external{
        deployment deployContract = new deployment();
     (eng,config) = deployContract.run();
    mockPriceFeed = AggregatorV3Interface(config.addressStore);
  
    }



    function testFinalSystem() external{
    address user = makeAddr("Saad");
    address user1 = makeAddr("Maaz");
    vm.deal(user,10 ether);
    vm.deal(user1,10 ether);

    //DEPOSIT AND MINT LOGIC

vm.startPrank(user);
engine.DepositAndMint{value:5 ether}(5000e18);
vm.stopPrank();

// MARKET FLUCTUATION HAPPENS




    }















}

