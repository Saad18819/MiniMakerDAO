// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {deployment} from "../../script/Deploy.s.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {VEngine} from "../../src/VaultEngine.sol";
import {dEngine} from "../../src/dEngineToken.sol";
import {MockV3Aggregator} from "./MockV3Aggregator.sol"; 
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract VaultTest is Test{

    VEngine engine;
    MockV3Aggregator mockPriceFeed;
    HelperConfig config;

    

    function setUp() public{
       deployment deployScript = new deployment(); 
       (engine,config) = deployScript.run();
       mockPriceFeed = MockV3Aggregator(config.addressStore());
   // MockV3Aggregator mockPriceFeed = MockV3Aggregator(HelperConfig.addressStore());
   // the above thing is wrong coz this is local declaration and the other function wont be able to know abt this variable
   // the question arises then what abt deployscript so its deleted as well just that when u run .run it got deployed at some address so that thign exist on that addres forever 
   // and also u cant write helperconfig coz when deploying u gotta return it in deployment so u can use it else directly calling that file is not a correct way

    }


address user = makeAddr("Saad");


function testethToUsd() external view{
assertEq(engine.ETHToUSD() ,2000e18);

}

function testNetAmntInUsd() external view{

uint256 amntinEther = engine.NetAmntInUSD(1 ether);
assertEq(amntinEther , 2000e18);
    
}

function testDepositAndMint() external{

    vm.deal(user,10 ether);
    vm.prank(user);
    engine.DepositAndMint{value:2 ether}(1000*1e18);
    assertEq(engine.collateral(user),2 ether);
    assertEq(engine.debt(user),1000*1e18);

}
// In Solidity, brackets [ ] are only used inside the contract that owns the mapping.
//When you access a public mapping from outside the contract (like in your Foundry test script using engine), Solidity automatically generates a getter function for you. Because it is a function call across contract boundaries, you must use parentheses ( ).


function testrevertDepositAndMint() external{
    vm.deal(user,2 ether);
     vm.prank(user);
    vm.expectRevert();
  
    engine.DepositAndMint{value:1 ether}(1500*1e18);
}




function testDebtAndWithdraw() external{

  vm.deal(user , 10 ether);
  vm.prank(user);
   engine.DepositAndMint{value:5 ether}(5000*1e18);
   engine.DebtAndWithdraw(3 ether,4000e18);
   assertEq(engine.collateral(user),2 ether);
   assertEq(engine.debt(user),1000e18);



}

function testrevertIfHealthIsGoodLiquidation() external{
    vm.deal(user,10 ether);
    vm.prank(user);
    engine.DepositAndMint{value:5 ether}(5000*1e18);

    address liquidator = makeAddr("SAAD");
    vm.deal(liquidator,10 ether);
    vm.prank(liquidator);
    vm.expectRevert();
    engine.liquidate(user,200e18);
}

function testLiquidationSuccess() external{
    
vm.deal(user,10 ether);
vm.prank(user);
engine.DepositAndMint{value:5 ether}(5000*1e18);

address liquidator = makeAddr("Khan");
mockPriceFeed.updateAnswer(1200e8);
// updateAnswer is an inbuilt function in chainlink oracle which updates the priceFeed


vm.deal(liquidator,10 ether);
vm.startPrank(liquidator);
engine.DepositAndMint{value:1 ether}(1000e18);
engine.liquidate(user,1000e18);
vm.stopPrank();
assertEq(engine.debt(user),4000e18);



}






}











