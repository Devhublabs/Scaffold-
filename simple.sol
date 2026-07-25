   // SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;// solidity version

contract simplestorage {
  bool hasFavouriteNumber = true;

uint256 myfavoriteNumber;// 0
uint256 listOfFavoriteNumbers;// [0, 76, 44]

struct person{
  uint256 favoriteNumber;
   string name;


}
person public ronald = person(3, "ronald");
person public obi = person(12, "obi");
person public Davis = person(7, "Davis");
 
  uint256 favouriteNumber = 97;
  string favoriteNumberInText = "66";
  address myAddress = 0x5B38Da6a701c568545dCfcB03FcB875f56beddC4;
  bytes32 favorite32 = "dog";

function store(uint256 _favouriteNumber) public {
    favouriteNumber = _favouriteNumber;
}
}