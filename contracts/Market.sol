// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Market is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;

    uint256 private listingPrice;

    constructor(uint basePrice) {
      listingPrice = basePrice;
    }

    enum ListingStatus {
	    Active,
	    Sold,
	    Cancelled
	  }

    struct MarketItem {
      uint itemId;
      address nftContract;
      uint256 tokenId;
      address payable seller;
      address payable owner;
      uint256 price;
      ListingStatus status;
    }

    mapping(uint256 => MarketItem) private idToMarketItem;

    event MarketItemCreated (
      uint indexed itemId,
      address indexed nftContract,
      uint indexed tokenId,
      address seller,
      address owner,
      uint256 price,
      ListingStatus status
    );

    event Sale(
	    uint listingId,
	    address buyer,
	    address token,
	    uint tokenId,
	    uint price
	  );

    event Cancel(
		  uint listingId,
		  address seller
	  );

    function setListingPrice(uint newListingPrice) public onlyOwner {
      listingPrice = newListingPrice;
    }

    function getListingPrice() public view returns (uint) {
      return listingPrice;
    }

    function getMarketItemsQuantity() public view returns (uint) {
      return _itemIds.current();
    }

    function getMarketItemData(uint itemId) public view returns (
      address nftContract, 
      uint tokenId, 
      address seller, 
      address owner, 
      uint price, 
      ListingStatus status
      ) {
      MarketItem memory item = idToMarketItem[itemId];
      nftContract = item.nftContract;
      tokenId = item.tokenId;
      seller = item.seller;
      owner = item.owner;
      price = item.price;
      status = item.status;
    }

    function createMarketItem(
    address nftContract,
    uint256 tokenId,
    uint256 price
    ) public payable nonReentrant {
      require(price > 0, "Price must be at least 1 wei");
      require(msg.value >= listingPrice, "Insufficient payment");

      _itemIds.increment();
      uint256 itemId = _itemIds.current();
  
      idToMarketItem[itemId] =  MarketItem(
        itemId,
        nftContract,
        tokenId,
        payable(msg.sender),
        payable(address(0)),
        price,
        ListingStatus.Active
      );

      IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

      emit MarketItemCreated(
        itemId,
        nftContract,
        tokenId,
        msg.sender,
        address(0),
        price,
        ListingStatus.Active
      );

    }

    function createMarketSale(
    address nftContract,
    uint256 itemId
    ) public payable nonReentrant {
      uint price = idToMarketItem[itemId].price;
      uint tokenId = idToMarketItem[itemId].tokenId;

      require(msg.sender != idToMarketItem[itemId].seller, "Seller cannot be buyer");
      require(msg.value >= price, "Insufficient payment");
      require(idToMarketItem[itemId].status == ListingStatus.Active, "Listing is not active");

      idToMarketItem[itemId].owner = payable(msg.sender);
      idToMarketItem[itemId].status = ListingStatus.Sold;
      idToMarketItem[itemId].seller.transfer(msg.value);

      IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

      payable(owner()).transfer(listingPrice);

      emit Sale(
			  itemId,
			  msg.sender,
			  idToMarketItem[itemId].nftContract,
			  idToMarketItem[itemId].tokenId,
			  idToMarketItem[itemId].price
		  );

    }

    function cancelListing(uint256 itemId) public nonReentrant {
		  MarketItem storage item = idToMarketItem[itemId];
  
		  require(msg.sender == item.seller, "Only seller can cancel listing");
		  require(item.status == ListingStatus.Active, "Listing is not active");
  
		  item.status = ListingStatus.Cancelled;
  
		  IERC721(item.nftContract).transferFrom(address(this), msg.sender, item.tokenId);
  
		  emit Cancel(itemId, item.seller);

	  }

}

//Thanks to:
//https://github.com/dabit3/polygon-ethereum-nextjs-marketplace/
//https://github.com/husnn/web3-tutorials/blob/master/02-nft-marketplace/contracts/Market.sol