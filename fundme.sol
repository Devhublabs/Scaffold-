// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract fundme{
    function fund() public payable { 
        // to send eth
    
    // allow users to send money
    // aloow users to withdraw
    require(msg.value > 1e18); 
    }



    function withdraw() public {}
}