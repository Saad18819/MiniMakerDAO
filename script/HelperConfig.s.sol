// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {MockV3Aggregator} from "test/Mock/Mockv3Aggregator.sol";

contract HelperConfig is Script{


struct NetworkConfig{
address priceFeed;
}

NetworkConfig public addressStore;

uint8 public constant DECIMALS = 8;
int256 public constant INITIAL_PRICE = 2000e8;

constructor(){
    if(block.chainid == 11155111){
        addressStore = NetworkConfig({priceFeed:0x694AA1769357215DE4FAC081bf1f309aDC325306});
    }else if(block.chainid ==1){
        addressStore = NetworkConfig({priceFeed:0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419});
    }else{
        addressStore = anvilConfig();
    }
}

function anvilConfig() public returns(NetworkConfig memory){


if(addressStore.priceFeed != address(0)){
    return addressStore;
}

vm.startBroadcast();

MockV3Aggregator mock = new MockV3Aggregator(DECIMALS ,INITIAL_PRICE );

vm.stopBroadcast();

NetworkConfig memory deployedAddress = NetworkConfig({priceFeed:address(mock)});

return deployedAddress;





}
















}
