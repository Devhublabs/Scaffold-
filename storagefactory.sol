// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;// solidity version


import "./simple.sol";


contract StorageFactory{
simplestorage public simpleStorage;

    function createsimplestoragecontract() public {
        simpleStorage = new simplestorage();

    }
    function sfstorage(uint256 _simplestorageindex, uint256 _newsimplestoragenumber) public {

}
}