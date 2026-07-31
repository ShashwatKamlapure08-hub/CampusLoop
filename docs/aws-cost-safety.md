# AWS Cost Safety — CampusLoop

This document defines the rules for keeping CampusLoop's AWS usage at $0. Follow this before creating an AWS account, and re-check it before every deployment session.

## 1. Account setup rules

- Create the AWS account only when we reach the deployment phase (Phase 3) — not before.
- On sign-up, AWS will offer a **Free Plan** (credits, auto-closes when exhausted or after 6 months) or a **Paid Plan** (credits, then standard billing). Choose whichever AWS defaults to for a new account, but note it down — we'll track credit usage.
- **Set a billing alarm immediately after account creation**, before touching any service:
  - CloudWatch → Alarms → Create Alarm → Billing → "Total Estimated Charge" > $0
  - This emails you the moment anything starts costing money.
- Optional but recommended: enable **AWS Cost Anomaly Detection** (free) for automatic alerts on unusual spend.

## 2. Services we will use, and their free limits

| Service | Free tier limit | Notes |
|---|---|---|
| EC2 | 750 hrs/month of `t2.micro` or `t3.micro` | Enough for one instance running 24/7 — but we won't leave it running 24/7 (see Section 3) |
| RDS | `db.t2.micro`/`db.t3.micro`, **Single-AZ only**, 20 GB storage | Never enable Multi-AZ — it doubles the cost and isn't covered by free tier |
| S3 | 5 GB storage, 20,000 GET / 2,000 PUT requests per month | Plenty for item images in a student project |
| SNS | 1 million notifications/month | Always free — no time limit, no risk |
| CloudWatch | 10 custom metrics, 10 alarms, 1M API requests/month | Always free — no time limit, no risk |
| IAM | No cost, ever | Always free |

## 3. Hard rules to avoid charges

1. **Instance type**: Only ever launch `t2.micro` or `t3.micro` for EC2 and RDS. Never anything larger, even "just to test."
2. **Single-AZ only**: Never enable Multi-AZ on RDS.
3. **No NAT Gateway**: Not free-tier eligible at all. Our architecture doesn't need one — EC2 sits in a public subnet with a Security Group controlling access.
4. **Stop EC2 when not actively working on it**: Stop (not just leave running) the instance after each work/dev session.
5. **Watch EBS volumes**: Storage attached to a stopped EC2 instance still bills (~$2.40/month for 30GB gp3). Delete unused volumes; don't create extra ones.
6. **No Elastic IPs left idle**: An Elastic IP not attached to a running instance incurs a small charge. Release any you're not using.
7. **Terminate everything after final submission/demo**: Once the project is graded, terminate EC2, delete the RDS instance, empty and delete the S3 bucket.
8. **Check the Billing Dashboard weekly** during active development — takes 30 seconds, catches problems early.

## 4. Before every AWS work session, ask:

- Is anything from a previous session still running that I forgot to stop?
- Am I about to launch anything above `t2.micro`/`t3.micro`?
- Am I enabling any feature (Multi-AZ, NAT Gateway, Load Balancer beyond free tier, CloudFront beyond 1TB) that isn't in the free tier table above?

If unsure, pause and check the official AWS Free Tier page before proceeding.
