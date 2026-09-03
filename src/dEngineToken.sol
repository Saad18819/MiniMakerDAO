// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";



contract dEngine is ERC20, Ownable{
error dEngineToken__MustBeMoreThanZero();
error dEngineToken__NotZeroAddress();

constructor() ERC20("dEngine Token", "DET") Ownable(msg.sender) {}

function mint(address _to, uint256 _amount) external onlyOwner returns (bool) {
        if (_to == address(0)) {
            revert dEngineToken__NotZeroAddress();
        }
        if (_amount == 0) {
            revert dEngineToken__MustBeMoreThanZero();
        }

        _mint(_to, _amount);
        return true;
    }

    function burn(address _from, uint256 _amount) external onlyOwner {
        if (_amount == 0) {
            revert dEngineToken__MustBeMoreThanZero();
        }

        _burn(_from, _amount);
    }

    function burnFrom(address account, uint256 amount) public{
    _spendAllowance(account, msg.sender, amount);
    _burn(account, amount);
}

}


/*
LEARNING

1. ERC20 is for fungible tokens
2. ERC21 is for NFT

import statements: Instead of writing hundreds of lines of code to handle balances, transfers, and security rules, we import ERC20 (the standard token blueprint) and Ownable (the security system) from OpenZeppelin

contract dEngineToken is ERC20, Ownable: This tells Solidity that our contract gets all the super powers of a standard token and an ownership manager.

constructor(): This function runs once when the contract is deployed.
ERC20("dEngine Token", "DET") names your token and sets its symbol.
Ownable(msg.sender) gives you (the deployer) the key to the vault room.


onlyOwner modifier: This is the bouncer standing at the door for mint() and burn().
Normal users cannot run these functions.
Only the "owner" can call them. Once you deploy VaultEngine.sol, you will transfer ownership to VaultEngine.sol, making the vault the only entity capable of printing or shredding tokens.


_mint(_to, _amount) & _burn(_from, _amount): These are the internal functions provided by OpenZeppelin.
_mint increases _to's token balance in the mapping and raises the total supply.
_burn decreases _from's token balance in the mapping and reduces the total supply.


 */