# Panboo Bug Bounty Program

## Overview

Panboo is committed to security and welcomes security researchers to help identify vulnerabilities in our smart contracts and platform. This bug bounty program outlines the scope, rewards, and disclosure process.

---

## Scope

### In-Scope Contracts

| Contract | Address | Network |
|----------|---------|---------|
| PanbooToken | TBD | BSC Mainnet |
| MasterChef | TBD | BSC Mainnet |

### In-Scope Vulnerabilities

#### Critical (Up to $50,000)
- Unauthorized minting of tokens
- Unauthorized withdrawal of funds from MasterChef
- Bypassing tax mechanism
- Unauthorized charity wallet changes
- Reentrancy vulnerabilities leading to fund loss
- Integer overflow/underflow leading to fund loss
- Price manipulation attacks
- Flash loan attacks affecting core functionality

#### High (Up to $25,000)
- DOS attacks on critical functions
- Tax rate manipulation bypassing timelock
- Reward calculation exploits
- LP token theft from MasterChef
- Ghost accrual exploits
- Incorrect reward distribution

#### Medium (Up to $10,000)
- Gas griefing attacks
- Precision loss in calculations
- Event emission failures
- Front-running vulnerabilities
- Sandwich attacks on donations

#### Low (Up to $5,000)
- Informational issues affecting security
- Best practice violations with security implications
- Documentation discrepancies affecting security

### Out of Scope

- Issues already known or disclosed
- Issues found in third-party contracts (PancakeSwap, OpenZeppelin)
- Theoretical vulnerabilities without proof of concept
- Social engineering attacks
- DDoS attacks
- UI/UX bugs without security impact
- Gas optimization without security impact

---

## Rewards

### Reward Criteria

Rewards are determined based on:

1. **Severity** - Impact and exploitability
2. **Quality** - Detail and clarity of report
3. **Proof of Concept** - Working exploit demonstration
4. **Fix Complexity** - Effort required to remediate

### Reward Tiers

| Severity | Minimum | Maximum | Currency |
|----------|---------|---------|----------|
| Critical | $10,000 | $50,000 | USDT/BNB |
| High | $5,000 | $25,000 | USDT/BNB |
| Medium | $2,000 | $10,000 | USDT/BNB |
| Low | $500 | $5,000 | USDT/BNB |

### Bonus Multipliers

- **First to Report**: +10%
- **Includes Fix**: +20%
- **Comprehensive Report**: +15%
- **Multiple Vulnerabilities**: +10% per additional bug

---

## Submission Process

### 1. Discovery

Research the contracts and identify potential vulnerabilities.

### 2. Documentation

Create a detailed report including:

```markdown
## Vulnerability Summary
- Type: [e.g., Reentrancy, Integer Overflow]
- Severity: [Critical/High/Medium/Low]
- Location: [Contract:Line]

## Description
[Detailed explanation of the vulnerability]

## Impact
[What can an attacker achieve?]

## Proof of Concept
[Step-by-step reproduction or code]

## Remediation
[Suggested fix]

## Additional Information
[Any other relevant details]
```

### 3. Submission

**Email**: security@panboo.io (PGP key: [link])

**Subject**: `[BUG BOUNTY] [SEVERITY] Brief Description`

**Attachments**:
- Detailed report (PDF or Markdown)
- Proof of Concept code
- Screenshots/videos if applicable

### 4. Response Timeline

- **Initial Response**: Within 24 hours
- **Triage**: Within 3 business days
- **Status Update**: Weekly until resolved
- **Resolution**: Varies by severity
- **Reward Payment**: Within 7 days of acceptance

---

## Rules of Engagement

### DO

✅ Research and test responsibly
✅ Use testnet contracts when possible
✅ Report vulnerabilities promptly
✅ Keep findings confidential until fixed
✅ Provide detailed, actionable reports
✅ Suggest fixes when possible
✅ Cooperate during verification

### DO NOT

❌ Test on mainnet with significant funds
❌ Perform DOS attacks on mainnet
❌ Publicly disclose before fix
❌ Demand rewards before triage
❌ Submit automated scanner results without validation
❌ Submit duplicate reports
❌ Attempt to exploit vulnerabilities for profit

---

## Severity Classification

### Critical

**Definition**: Vulnerabilities that can lead to direct loss of funds or complete system compromise.

**Examples**:
- Unauthorized token minting
- Theft of user funds from MasterChef
- Bypassing charity tax entirely
- Unauthorized ownership transfer
- Reentrancy draining contract balance

**Requirements**:
- Must include working proof of concept
- Must demonstrate actual fund loss scenario
- Must be exploitable on mainnet

### High

**Definition**: Vulnerabilities that significantly impact functionality or can lead to fund loss under specific conditions.

**Examples**:
- Incorrect reward calculations
- Tax rate manipulation
- LP token lock-in
- Ghost accrual exploits
- Timelock bypass

**Requirements**:
- Clear attack vector demonstrated
- Impact quantified
- Reproducible scenario

### Medium

**Definition**: Vulnerabilities that affect functionality but require specific conditions or have limited impact.

**Examples**:
- Front-running opportunities
- Precision loss in edge cases
- Gas griefing
- Event emission failures
- Minor calculation errors

**Requirements**:
- Reproducible issue
- Clear impact explanation
- Suggested mitigation

### Low

**Definition**: Best practice violations or informational issues with potential security implications.

**Examples**:
- Missing input validation
- Inadequate error messages
- Suboptimal access controls
- Documentation gaps
- Code optimization opportunities

**Requirements**:
- Security relevance explained
- Recommendations provided

---

## Example Report

```markdown
# Buffer Overflow in Reward Calculation

## Vulnerability Summary
- **Type**: Integer Overflow
- **Severity**: Critical
- **Location**: MasterChef.sol:253

## Description
The `pendingReward` function multiplies large values without
overflow protection, allowing an attacker to create integer
overflow and drain the reward pool.

## Impact
An attacker with a large stake can:
1. Trigger integer overflow in reward calculation
2. Receive inflated reward amounts
3. Drain the entire reward pool
4. Estimated loss: Up to 100M PNB ($XXX,XXX)

## Proof of Concept

```solidity
// Attack contract
contract Exploit {
    function attack(MasterChef chef) external {
        // 1. Deposit max uint256 amount
        chef.deposit(0, type(uint256).max);

        // 2. Wait one block

        // 3. Harvest inflated rewards
        chef.harvest(0);

        // Result: Integer overflow gives massive rewards
    }
}
```

## Steps to Reproduce
1. Deploy attack contract on testnet
2. Acquire large LP token amount
3. Execute attack() function
4. Observe inflated rewards

## Remediation

```solidity
// Use SafeMath or Solidity 0.8+ built-in overflow checks
function pendingReward(uint256 _pid, address _user)
    external
    view
    returns (uint256)
{
    // Add overflow protection
    uint256 pending = user.amount * pool.accRewardPerShare;
    require(pending / pool.accRewardPerShare == user.amount, "Overflow");

    return (pending / ACC_PRECISION) - user.rewardDebt;
}
```

## Additional Information
- Affects all users with large stakes
- Can be triggered repeatedly
- No existing safeguards in place
- Similar to [reference vulnerability]

## Researcher Information
- Name: [Your Name]
- Email: [Your Email]
- BNB Address for Reward: 0x...
```

---

## Responsible Disclosure

### Timeline

1. **Day 0**: Vulnerability reported to security@panboo.io
2. **Day 1**: Initial response confirming receipt
3. **Day 3**: Triage complete, severity assigned
4. **Day 7**: Fix developed and tested
5. **Day 14**: Fix deployed to mainnet
6. **Day 21**: Public disclosure (coordinated)
7. **Day 28**: Reward payment

### Public Disclosure

- Security researchers MUST NOT publicly disclose before fix is deployed
- Panboo will coordinate disclosure timeline with researcher
- Public disclosure includes:
  - Vulnerability description
  - Fix implementation
  - Credit to researcher (if desired)
  - Post-mortem analysis

---

## Hall of Fame

Recognized security researchers (with permission):

| Researcher | Vulnerability | Severity | Reward | Date |
|------------|---------------|----------|---------|------|
| TBD | TBD | TBD | TBD | TBD |

---

## Legal

### Safe Harbor

Panboo commits to:

- Not pursue legal action against researchers who:
  - Follow the rules of engagement
  - Report vulnerabilities responsibly
  - Do not exploit findings for personal gain

- Work with researchers to verify and fix issues

- Provide fair compensation for valid findings

### Terms

- All rewards are paid at Panboo's discretion
- Duplicate reports are not eligible for rewards
- Panboo reserves the right to modify reward amounts based on quality
- Final decisions on severity and rewards rest with Panboo
- Participation constitutes acceptance of these terms

---

## Contact

**Primary**: security@panboo.io
**PGP Key**: [Link to PGP public key]
**Response Time**: 24 hours

**Alternative**:
- Discord: [Panboo Official Discord]
- Telegram: [Panboo Official Telegram]

**Emergency** (Critical vulnerabilities only):
- [Emergency contact details]

---

## Resources

### Contract Addresses
- Testnet: [Link to BSC Testnet deployment]
- Mainnet: [Link to BSC Mainnet deployment]

### Source Code
- GitHub: [Link to repository]
- Verified Contracts: [Link to BscScan]

### Documentation
- Smart Contract Documentation: [Link]
- Technical Whitepaper: [Link]
- Architecture Diagrams: [Link]

### Previous Audits
- [Audit Firm 1]: [Link to report]
- [Audit Firm 2]: [Link to report]

---

## Program Updates

### Version History

**v1.0.0** - 2025-11-10
- Initial bug bounty program launch
- Scope defined
- Reward tiers established

---

## Frequently Asked Questions

### Q: Can I test on mainnet?
**A**: Only with negligible amounts. Significant testing should be done on testnet or local fork.

### Q: How are duplicates handled?
**A**: First valid report receives full reward. Subsequent duplicates may receive partial credit.

### Q: Can I report multiple bugs?
**A**: Yes! Each unique vulnerability is eligible for a separate reward.

### Q: What if my report is rejected?
**A**: We'll provide detailed feedback. You can resubmit with additional evidence.

### Q: How long until I receive payment?
**A**: Within 7 days of fix deployment and reward acceptance.

### Q: Can I remain anonymous?
**A**: Yes, but you must provide a valid email and BNB address for reward payment.

### Q: What if I found a bug in a dependency?
**A**: Report it to the dependency's bug bounty program, then inform us.

### Q: Can I disclose after the fix?
**A**: Yes, after coordinated disclosure timeline with Panboo team.

---

**Program Status**: Active
**Last Updated**: 2025-11-10
**Program Manager**: Panboo Security Team
