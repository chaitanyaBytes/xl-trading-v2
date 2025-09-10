import { type UserBalance } from "./types";

export class UserBalanceStore {
  private userBalances = new Map<string, UserBalance>();

  getBalance(emailId: string): UserBalance | null {
    return this.userBalances.get(emailId) ?? null;
  }

  initializeUserBalance(emailId: string, initialBalance: bigint): UserBalance {
    const balance: UserBalance = {
      emailId: emailId,
      availableBalance: initialBalance,
      lockedMargin: 0n,
      totalBalance: 0n,
      lastUpdated: Date.now(),
    };

    this.userBalances.set(emailId, balance);
    return balance;
  }

  addBalance(emailId: string, amount: bigint): boolean {
    const userBalance = this.userBalances.get(emailId);

    if (!userBalance) return false;

    userBalance.availableBalance += amount;
    this.userBalances.set(emailId, userBalance);
    return true;
  }

  lockMargin(email: string, amount: bigint): boolean {
    const balance = this.userBalances.get(email);
    if (!balance || balance.availableBalance < amount) return false;

    balance.availableBalance -= amount;
    balance.lockedMargin += amount;
    balance.lastUpdated = Date.now();

    this.userBalances.set(email, balance);

    return true;
  }

  releaseMargin(email: string, amount: bigint, pnl: bigint = 0n): void {
    const balance = this.userBalances.get(email);
    if (!balance) return;

    balance.lockedMargin -= amount;
    balance.availableBalance += amount + pnl;
    balance.totalBalance += pnl;
    balance.lastUpdated = Date.now();

    this.userBalances.set(email, balance);
  }
}
