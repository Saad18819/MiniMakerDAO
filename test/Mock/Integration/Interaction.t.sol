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


uint256 constant STARTING_MONEY = 10 ether;

address user = makeAddr("Saad");
address user1 = makeAddr("Maaz");



    function setup() external{
        deployment deployContract = new deployment();
     (eng,config) = deployContract.run();
    mockPriceFeed = AggregatorV3Interface(config.addressStore);
    vm.deal(user,STARTING_MONEY);
    vm.deal(user1,STARTING_MONEY);
    }

    













}

