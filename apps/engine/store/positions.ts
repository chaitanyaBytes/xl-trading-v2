import { DECIMALS } from "./assets";
import type { Position, RiskConfig } from "@repo/common";
import { UserBalanceStore } from "./userBalance";

export class PositionStore {
  private allPositions = new Map<string, Position>(); // positionId -> position
  private userPostions = new Map<string, Position[]>(); // userId -> Position[]

  constructor(
    private userBalances: UserBalanceStore,
    private riskConfig: RiskConfig
  ) {}

  private calculateLiquidationPrice(position: Position): bigint {
    const marginRatio = this.riskConfig.maintenanceMarginRate;
    const adjustedMarginRatio = BigInt(
      Math.floor(marginRatio * Math.pow(10, DECIMALS))
    );

    // maintainence margin = (size * openPrice) * MMR
    // liquidation happens at:
    // equity <= MM
    // margin + unrealisedPnl <= MM
    // margin + (currPrice - openPrice) * size <= MM
    const maintainenceMargin =
      (position.size * position.openPrice * adjustedMarginRatio) /
      BigInt(Math.pow(10, 12));

    let liquidationPrice: bigint;
    if (position.side === "buy") {
      liquidationPrice =
        position.openPrice -
        (position.margin - maintainenceMargin) / position.size;
    } else {
      liquidationPrice =
        position.openPrice +
        (position.margin - maintainenceMargin) / position.size;
    }

    return liquidationPrice;
  }

  checkLiquidation(positionId: string, currentPrice: bigint): boolean {
    const position = this.allPositions.get(positionId);
    if (!position || position.status === "closed") return false;

    if (position.side === "buy" && currentPrice <= position.liquidationPrice) {
      // this.liquidatePosition(positionId, currentPrice);
      return true;
    }

    if (position.side === "sell" && currentPrice >= position.liquidationPrice) {
      // this.liquidatePosition(positionId, currentPrice);
      return true;
    }

    return false;
  }

  getUserPositions(emailId: string): Position[] {
    return this.userPostions.get(emailId) || [];
  }

  openPosition(position: Position): boolean {
    const lockedMargin = this.userBalances.lockMargin(
      position.emailId,
      position.margin
    );
    if (!lockedMargin) return false;

    position.liquidationPrice = this.calculateLiquidationPrice(position);

    const userPos = this.userPostions.get(position.emailId) || [];
    userPos.push(position);
    this.userPostions.set(position.emailId, userPos);
    this.allPositions.set(position.positionId, position);

    return true;
  }

  closePosition(positionId: string, closePrice: bigint): Position | null {
    const position = this.allPositions.get(positionId);
    if (!position || position.status === "closed") return null;

    const priceDiff = closePrice - position.openPrice;
    const multiplier = position.side === "buy" ? 1n : -1n;
    const realizedPnl = priceDiff * position.size * multiplier;
    position.realizedPnl = realizedPnl;

    position.status = "closed";
    position.closedAt = Date.now();
    position.closedPrice = closePrice;

    this.userBalances.releaseMargin(
      position.emailId,
      position.margin,
      realizedPnl
    );

    return position;
  }
}
