// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MockERC20.sol";

/**
 * @title MockPerpDEX
 * @notice Simulated Perpetual / Commodity exchange for testing agent derivatives trading,
 * leverage bounds, and margin call liquidations.
 */
contract MockPerpDEX {
    struct Position {
        uint256 id;
        address trader;
        address asset;
        bool isLong;
        uint256 size;             // Notional position size in USDC (6 decimals)
        uint256 collateral;       // Collateral deposited in USDC (6 decimals)
        uint256 entryPrice;       // Price with 8 decimals (e.g. $30.00 = 3000000000)
        uint256 stopLossPrice;    // Stop loss price with 8 decimals
        uint8 leverage;           // e.g. 2 = 2x
        bool isOpen;
    }

    MockERC20 public immutable usdc;
    uint256 public nextPositionId = 1;
    mapping(uint256 => Position) public positions;

    // Asset => Price (8 decimals, e.g. $30.50 = 3050000000)
    mapping(address => uint256) public markPrices;

    event PositionOpened(uint256 indexed id, address indexed trader, address asset, bool isLong, uint256 size, uint256 collateral, uint8 leverage);
    event MarginTopUp(uint256 indexed id, uint256 addedCollateral, uint256 totalCollateral);
    event PositionClosed(uint256 indexed id, int256 pnl, uint256 returnedCollateral);
    event PositionLiquidated(uint256 indexed id, uint256 markPrice);

    constructor(address _usdc) {
        usdc = MockERC20(_usdc);
    }

    function setMarkPrice(address asset, uint256 price) external {
        markPrices[asset] = price;
    }

    function openPosition(
        address asset,
        bool isLong,
        uint256 size,
        uint256 collateral,
        uint256 stopLossPrice,
        uint8 leverage
    ) external returns (uint256 id) {
        require(collateral > 0, "Zero collateral");
        require(leverage >= 1 && leverage <= 50, "Invalid leverage");
        require(size <= collateral * leverage, "Size exceeds leverage");

        // Pull collateral from trader
        require(usdc.transferFrom(msg.sender, address(this), collateral), "USDC transfer failed");

        uint256 price = markPrices[asset];
        if (price == 0) price = 3000000000; // Default $30.00

        id = nextPositionId++;
        positions[id] = Position({
            id: id,
            trader: msg.sender,
            asset: asset,
            isLong: isLong,
            size: size,
            collateral: collateral,
            entryPrice: price,
            stopLossPrice: stopLossPrice,
            leverage: leverage,
            isOpen: true
        });

        emit PositionOpened(id, msg.sender, asset, isLong, size, collateral, leverage);
    }

    function topUpCollateral(uint256 positionId, uint256 additionalCollateral) external {
        Position storage pos = positions[positionId];
        require(pos.isOpen, "Position not open");
        require(usdc.transferFrom(msg.sender, address(this), additionalCollateral), "Transfer failed");

        pos.collateral += additionalCollateral;
        emit MarginTopUp(positionId, additionalCollateral, pos.collateral);
    }

    function closePosition(uint256 positionId) external {
        Position storage pos = positions[positionId];
        require(pos.isOpen, "Position not open");
        require(pos.trader == msg.sender, "Not position owner");

        pos.isOpen = false;
        // Return collateral to trader
        usdc.transfer(pos.trader, pos.collateral);

        emit PositionClosed(positionId, 0, pos.collateral);
    }

    /**
     * @notice Calculate liquidation price for a position
     */
    function getLiquidationPrice(uint256 positionId) external view returns (uint256) {
        Position memory pos = positions[positionId];
        if (!pos.isOpen) return 0;
        // Maintenance margin ratio = 5% (500 basis points)
        if (pos.isLong) {
            // LiqPrice = EntryPrice * (1 - 1/leverage + 0.05)
            uint256 delta = (pos.entryPrice * 95) / (pos.leverage * 100);
            return pos.entryPrice > delta ? pos.entryPrice - delta : 0;
        } else {
            uint256 delta = (pos.entryPrice * 95) / (pos.leverage * 100);
            return pos.entryPrice + delta;
        }
    }
}
