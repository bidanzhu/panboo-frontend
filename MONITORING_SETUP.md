# Panboo Monitoring & Analytics Setup

## Overview

This guide covers setting up comprehensive monitoring for the Panboo DeFi charity platform.

---

## 1. Dune Analytics Dashboard

### Dashboard Components

#### A. Token Metrics
- Total supply and circulating supply
- Holder count and distribution
- Daily/weekly/monthly trading volume
- Price history (PNB/BNB, PNB/USD)
- Market cap

#### B. Charity Metrics
- Total donated (BNB and USD)
- Number of donations
- Average donation amount
- Donation frequency (per day/week/month)
- Top donation events
- Charity wallet balance

#### C. Farm Metrics
- Total Value Locked (TVL)
- Number of stakers
- Rewards distributed
- APR per pool
- Daily emissions

#### D. Tax Metrics
- Total tax collected
- Buy vs Sell tax breakdown
- Tax efficiency (collected vs donated)
- Pending pledges (accumulated but not yet swapped)

### Sample Dune SQL Queries

#### Total Donations Query
```sql
-- Total Donations from PanbooToken Contract
SELECT
    DATE_TRUNC('day', evt_block_time) as date,
    SUM(bnbSent) / 1e18 as total_bnb_donated,
    COUNT(*) as donation_count
FROM bnb.`PanbooToken_evt_Donated`
WHERE contract_address = {{panboo_token_address}}
GROUP BY 1
ORDER BY 1 DESC
```

#### Tax Collection Query
```sql
-- Tax Collected by Type
SELECT
    DATE_TRUNC('day', evt_block_time) as date,
    CASE WHEN isSell = true THEN 'Sell Tax' ELSE 'Buy Tax' END as tax_type,
    SUM(amount) / 1e18 as total_tax_collected
FROM bnb.`PanbooToken_evt_TaxCollected`
WHERE contract_address = {{panboo_token_address}}
GROUP BY 1, 2
ORDER BY 1 DESC
```

#### TVL Query
```sql
-- Total Value Locked in MasterChef
SELECT
    DATE_TRUNC('day', evt_block_time) as date,
    SUM(CASE WHEN evt_type = 'Deposit' THEN amount ELSE -amount END) / 1e18 as tvl_change
FROM (
    SELECT evt_block_time, amount, 'Deposit' as evt_type
    FROM bnb.`MasterChef_evt_Deposit`
    WHERE contract_address = {{masterchef_address}}
    UNION ALL
    SELECT evt_block_time, amount, 'Withdraw' as evt_type
    FROM bnb.`MasterChef_evt_Withdraw`
    WHERE contract_address = {{masterchef_address}}
) combined
GROUP BY 1
ORDER BY 1 DESC
```

---

## 2. The Graph Subgraph

### Entities to Track

```graphql
type Token @entity {
  id: ID!
  name: String!
  symbol: String!
  decimals: Int!
  totalSupply: BigInt!
  buyTaxBps: Int!
  sellTaxBps: Int!
  charityWallet: Bytes!
}

type Donation @entity {
  id: ID!
  tokensSold: BigInt!
  bnbSent: BigInt!
  recipient: Bytes!
  timestamp: BigInt!
  transactionHash: Bytes!
}

type Pool @entity {
  id: ID!
  lpToken: Bytes!
  allocPoint: BigInt!
  totalStaked: BigInt!
  accRewardPerShare: BigInt!
}

type UserStake @entity {
  id: ID!
  user: Bytes!
  pool: Pool!
  amount: BigInt!
  rewardDebt: BigInt!
  pendingRewards: BigInt!
}

type DailySummary @entity {
  id: ID!
  date: Int!
  totalDonatedBNB: BigInt!
  totalDonatedUSD: BigDecimal!
  donationCount: Int!
  totalTaxCollected: BigInt!
  tvl: BigInt!
  uniqueStakers: Int!
}
```

---

## 3. Monitoring Alerts

### Critical Alerts

#### A. Donation Failures
```javascript
// Monitor for failed donations
if (event.name === "DonationSkipped") {
  alert({
    severity: "WARNING",
    message: `Donation skipped: ${event.bnbAmount} BNB < ${event.minRequired} BNB minimum`,
    action: "Check contract balance and tax accumulation"
  });
}
```

#### B. Low Reward Balance
```javascript
// Alert when MasterChef rewards running low
const rewardBalance = await panbooToken.balanceOf(masterChefAddress);
const rewardPerBlock = await masterChef.rewardPerBlock();
const daysRemaining = rewardBalance / (rewardPerBlock * 28800n); // 28800 blocks/day

if (daysRemaining < 7n) {
  alert({
    severity: "CRITICAL",
    message: `MasterChef rewards running low: ${daysRemaining} days remaining`,
    action: "Fund MasterChef with reward tokens"
  });
}
```

#### C. Tax Rate Changes
```javascript
// Monitor tax rate changes (timelock events)
if (event.name === "TaxChangeScheduled") {
  alert({
    severity: "INFO",
    message: `Tax change scheduled: Buy ${event.newBuyTax / 100}%, Sell ${event.newSellTax / 100}%`,
    executeAfter: new Date(event.executeAfter * 1000)
  });
}
```

#### D. Large Donations
```javascript
// Alert on large donations
if (event.name === "Donated") {
  const donationUSD = event.bnbSent * bnbPrice;

  if (donationUSD > 10000) { // > $10k
    alert({
      severity: "INFO",
      message: `Large donation: ${donationUSD.toFixed(2)} USD sent to charity`,
      transactionHash: event.transactionHash
    });
  }
}
```

---

## 4. Dashboard Metrics

### Real-Time Metrics (Update every 15s)
- Current PNB price
- 24h trading volume
- 24h price change
- Total holders
- Current TVL
- Pending donations (accumulated tax)

### Daily Metrics
- Daily donated amount (BNB & USD)
- Daily donation count
- Daily tax collected
- Daily unique traders
- Daily unique stakers
- New holders

### All-Time Metrics
- Total donated (BNB & USD)
- Total donation count
- Total tax collected
- Lifetime unique stakers
- Lifetime unique traders

---

## 5. Transparency Page

### Public Charity Dashboard

Display on website:

```typescript
interface CharityStats {
  totalDonatedBNB: string;
  totalDonatedUSD: string;
  donationCount: number;
  charityWallet: string;
  lastDonation: {
    amount: string;
    timestamp: Date;
    txHash: string;
  };
  recentDonations: Array<{
    amount: string;
    timestamp: Date;
    txHash: string;
  }>;
  pendingPledges: string; // Accumulated tax not yet swapped
}
```

### Example UI Component

```tsx
<div className="charity-dashboard">
  <h2>Charity Transparency</h2>

  <div className="stat-cards">
    <Card>
      <h3>Total Donated</h3>
      <p className="amount">{formatBNB(stats.totalDonatedBNB)} BNB</p>
      <p className="usd">≈ ${formatUSD(stats.totalDonatedUSD)}</p>
    </Card>

    <Card>
      <h3>Donations</h3>
      <p className="count">{stats.donationCount} times</p>
    </Card>

    <Card>
      <h3>Pending Pledges</h3>
      <p className="amount">{formatPNB(stats.pendingPledges)} PNB</p>
      <p className="note">Waiting to be swapped</p>
    </Card>
  </div>

  <div className="charity-wallet">
    <h3>Charity Wallet</h3>
    <AddressDisplay address={stats.charityWallet} />
    <a href={`https://bscscan.com/address/${stats.charityWallet}`}>
      View on BscScan →
    </a>
  </div>

  <div className="recent-donations">
    <h3>Recent Donations</h3>
    <Table>
      {stats.recentDonations.map(donation => (
        <Row key={donation.txHash}>
          <Cell>{formatBNB(donation.amount)} BNB</Cell>
          <Cell>{formatDate(donation.timestamp)}</Cell>
          <Cell>
            <a href={`https://bscscan.com/tx/${donation.txHash}`}>
              View TX →
            </a>
          </Cell>
        </Row>
      ))}
    </Table>
  </div>
</div>
```

---

## 6. Monitoring Tools

### Recommended Services

1. **Dune Analytics** - Custom dashboards and queries
2. **The Graph** - Real-time indexing and queries
3. **Tenderly** - Transaction monitoring and alerts
4. **OpenZeppelin Defender** - Security monitoring
5. **Blocknative** - Mempool monitoring
6. **BscScan API** - Contract event tracking

### Alert Channels

- **Telegram Bot** - Instant notifications
- **Discord Webhook** - Team alerts
- **Email** - Daily/weekly summaries
- **PagerDuty** - Critical incidents

---

## 7. Implementation Checklist

### Phase 1: Basic Monitoring
- [ ] Set up BscScan API access
- [ ] Create basic Dune Analytics dashboard
- [ ] Implement charity page on website
- [ ] Set up Telegram bot for alerts

### Phase 2: Advanced Analytics
- [ ] Deploy The Graph subgraph
- [ ] Create comprehensive Dune queries
- [ ] Implement real-time price feeds
- [ ] Set up Tenderly monitoring

### Phase 3: Automation
- [ ] Automated weekly charity reports
- [ ] Automated reward balance checks
- [ ] Automated tax efficiency reports
- [ ] Automated TVL tracking

---

## 8. Sample Alert Configuration

```javascript
// alerts.config.js
module.exports = {
  lowRewards: {
    threshold: 7, // days
    severity: "CRITICAL",
    channels: ["telegram", "email", "pagerduty"]
  },

  largeDonation: {
    thresholdUSD: 10000,
    severity: "INFO",
    channels: ["telegram", "discord"]
  },

  donationFailure: {
    severity: "WARNING",
    channels: ["telegram", "discord"]
  },

  taxChange: {
    severity: "INFO",
    channels: ["telegram", "discord", "email"]
  },

  tradingDisabled: {
    severity: "CRITICAL",
    channels: ["telegram", "email", "pagerduty"]
  }
};
```

---

## 9. Metrics to Track

### Financial Metrics
- [ ] Total donated (all-time, monthly, weekly, daily)
- [ ] Donation frequency
- [ ] Average donation amount
- [ ] Tax collection efficiency
- [ ] TVL growth
- [ ] Price stability

### User Metrics
- [ ] Total holders
- [ ] Active traders (daily/weekly/monthly)
- [ ] Active stakers
- [ ] New users per day
- [ ] User retention rate

### System Health Metrics
- [ ] Auto-swap success rate
- [ ] Donation success rate
- [ ] Contract gas usage
- [ ] Reward token balance
- [ ] LP reserves

---

## 10. Reporting Schedule

### Daily
- Total donated today
- Number of donations
- New holders
- TVL change
- Price change

### Weekly
- Weekly donation summary
- Top donation events
- User growth
- TVL trend
- Price performance

### Monthly
- Monthly charity report
- Comprehensive metrics dashboard
- User analytics
- Financial summary
- Governance updates

---

**Setup Priority**: High
**Estimated Setup Time**: 2-3 days
**Maintenance**: Ongoing
