// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {dEngine} from "./dEngineToken.sol";

contract VEngine{

    dEngine private immutable i_dEngine;



    error SurpassingLimit();
    error HealthFactorBroken();
    error HealthGood();


uint256 public constant LIQUIDATION_BONUS = 10;



address[] public funders;
    mapping(address User => uint256 ETHdeposited) public collateral;
    mapping(address User => uint256 DETtokensamntinUSD) public debt;




    constructor(address engineAdd){
        i_dEngine = dEngine(engineAdd);

        // this putting address inside is just typecasting basically we did this is coz at that address jaha pe dengine deployed hua hai voh vala chaiye apan ko thats why we put an address
        // You use address in the constructor whenever your contract needs to talk to a contract that ALREADY EXISTS on the blockchain.

    }





function ETHToUSD() public view returns(uint256){

AggregatorV3Interface datafeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
(,int256 answer,,) = datafeed.latestRoundData();
return uint256(answer * 1e10);

}





function NetAmntInUSD(uint256 _amnt) public view returns(uint256){

uint256 SingleEthInUSDPrice = ETHToUSD();
uint256 NetAmnt = (SingleEthInUSDPrice * _amnt)/1e18;
return NetAmnt;



}





function healthFactor(address user) public view returns(bool){

      if(debt[user] == 0){
        return true;
      }

      return (NetAmntInUSD(collateral[user])) >=((15*debt[user])/10);



}






function DepositAndMint(uint256 AmntMint) payable public{
    uint256 AmntFunded = NetAmntInUSD(msg.value);
    uint256 MaxDebtToken = (AmntFunded*10)/15;

      funders.push(msg.sender);
    collateral[msg.sender]+= msg.value;
debt[msg.sender] += AmntMint;

    if(healthFactor(msg.sender)){
    i_dEngine.mint(msg.sender,AmntMint);
    }
    else{
revert SurpassingLimit();
    }


}






function DebtAndWithdraw(uint256 EthWithdraw, uint256 TokenBurn) public{

  collateral[msg.sender]-= EthWithdraw;
  debt[msg.sender] -= TokenBurn;
  
  if(healthFactor(msg.sender)){
     i_dEngine.burn(msg.sender,TokenBurn);
    (bool callSuccess, )=payable(msg.sender).call{value:EthWithdraw}("");
  // reetrancy issue ke liye u burn first and then bool thing comes

  }
  
  else{
    revert HealthFactorBroken();
  }




}



function debtAmntToETH(uint256 _amntpaying) public view returns(uint256){
    uint256 oneEthPrice = ETHToUSD();
    return (_amntpaying * 1e18)/oneEthPrice;
}

function liquidate(address user , uint256 debtCovering) external{

    if(healthFactor(user)){
        revert HealthGood();
    }

uint256 ethGetting = debtAmntToETH(debtCovering);
uint256 bonusEth = (LIQUIDATION_BONUS*ethGetting)/100;
uint256 netEth = ethGetting + bonusEth;

debt[user]-=debtCovering;
collateral[user]-=netEth;

i_dEngine.burnFrom(msg.sender,debtCovering);


(bool success, ) = payable(msg.sender).call{value: netEth}("");







}



}