import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { NFT } from "../typechain/NFT";
import { Market } from "../typechain/Market"

let nftContract:NFT;
let marketContract:Market;

beforeEach(async () => {
  
  const Market = await ethers.getContractFactory("Market");
  const market = await Market.deploy(ethers.utils.parseUnits("1", "ether"));
  await market.deployed();
  marketContract = market;

  const NFT = await ethers.getContractFactory("NFT");
  const nft = await NFT.deploy(market.address);
  await nft.deployed();
  nftContract = nft;

});

describe("NFT", function () {

  it("Should create a contract with the correct market address", async function () {

    expect(await nftContract.marketPlaceAddress()).to.equal(marketContract.address);

  });

  it("Should create a new token and set its URI", async function () {

    const createTokenTx = await nftContract.createToken("https://google.com");
    await createTokenTx.wait();

    expect(await nftContract.tokenURI(1)).to.equal("https://google.com");

  });

});

describe("Market", function () {

  it("Should create a market with 1 ether listing price", async function () {

    expect(await marketContract.getListingPrice()).to.equal(ethers.utils.parseUnits("1", "ether"));

  });

  it("Should create a new market item", async function () {

    const createTokenTx = await nftContract.createToken("https://google.com");
    await createTokenTx.wait();

    const listingPrice = (await marketContract.getListingPrice()).toString();

    const createMarketItemTx = await marketContract.createMarketItem(
      nftContract.address, 
      1, 
      ethers.utils.parseUnits("1", "ether"),
      { value: listingPrice }
    );
    await createMarketItemTx.wait();

    const marketItemData = await marketContract.getMarketItemData(1);

    const accounts = await ethers.getSigners()

    expect(marketItemData.seller).to.equal(accounts[0].address);

  });

  it("Should create a market sale", async function () {

    const createTokenTx = await nftContract.createToken("https://google.com");
    await createTokenTx.wait();

    const listingPrice = (await marketContract.getListingPrice()).toString();

    const createMarketItemTx = await marketContract.createMarketItem(
      nftContract.address, 
      1, 
      ethers.utils.parseUnits("1", "ether"),
      { value: listingPrice }
    );
    await createMarketItemTx.wait();

    const marketItemData = await marketContract.getMarketItemData(1);

    const accounts = await ethers.getSigners();

    await marketContract.connect(accounts[1]).createMarketSale(
      marketItemData.nftContract,
      1,
      { value: marketItemData.price}
    );

    const marketItemDataUpdated = await marketContract.getMarketItemData(1);

    expect(marketItemDataUpdated.owner).to.equal(accounts[1].address);
    expect(marketItemDataUpdated.status).to.equal(1);

  });

  it("Should not create a market item with insufficient payment", async function () {

    try {
  
      const createTokenTx = await nftContract.createToken("https://google.com");
      await createTokenTx.wait();
  
      const createMarketItemTx = await marketContract.createMarketItem(
        nftContract.address, 
        1, 
        ethers.utils.parseUnits("1", "ether"),
        { value: "1000"}
      );

      await createMarketItemTx.wait();
      
      assert(false);
  
    } catch (error) {
  
      assert(error);

    }

  });

  it("Should not create a market sale with insufficient payment", async function () {

    try {

      const listingPrice = (await marketContract.getListingPrice()).toString();
  
      const createTokenTx = await nftContract.createToken("https://google.com");
      await createTokenTx.wait();
  
      const createMarketItemTx = await marketContract.createMarketItem(
        nftContract.address, 
        1, 
        ethers.utils.parseUnits("1", "ether"),
        { value: listingPrice}
      );

      await createMarketItemTx.wait();

      const accounts = await ethers.getSigners();

      await marketContract.connect(accounts[1]).createMarketSale(
        nftContract.address, 
        1,
        { value: ethers.utils.parseUnits("0.5", "ether")}
      );
      
      assert(false);
  
    } catch (error) {
  
      assert(error);

    }

  });

  it("Should cancel a listing", async function () {

      const listingPrice = (await marketContract.getListingPrice()).toString();
  
      const createTokenTx = await nftContract.createToken("https://google.com");
      await createTokenTx.wait();
  
      const createMarketItemTx = await marketContract.createMarketItem(
        nftContract.address, 
        1, 
        ethers.utils.parseUnits("1", "ether"),
        { value: listingPrice}
      );
      await createMarketItemTx.wait();
      
      const cancelListingTx = await marketContract.cancelListing(1);
      await cancelListingTx.wait();

      const marketItemData = await marketContract.getMarketItemData(1);

      expect(marketItemData.status).to.equal(2);

  });

});
