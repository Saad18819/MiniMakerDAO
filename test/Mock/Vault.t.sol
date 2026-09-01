// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {deployment} from "../script/Deploy.s.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";
import {VEngine} from "../src/VaultEngine.sol";
import {dEngine} from "../src/dEngineToken.sol";


contract VaultTest is Test{

    VEngine engine;

    function setup() public{
       deployment deployScript = new deployment(); 
       engine = deployScript.run();
    }


address user = makeAddr("Saad");


function testethToUsd() external{
assertEq(engine.ETHToUSD() ,2000e18);

}

function testNetAmntInUsd() external{

uint256 amntinEther = NetAmntInUSD(1 ether);
assertEq(amntinEther , 2000e18);
    
}

function testDepositAndMint() external{

    vm.deal(user,10 ether);
    vm.prank(user);
    DepositAndMint{value:2 ether}(100*1e18);
    assertEq(collateral[user],2 ether);
    assertEq(debt[user],100*1e18);
    
}




}






