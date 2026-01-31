# Kona Localization & Expansion Guide
## Multi-Region Rollout Strategy

---

## 🌍 Expansion Roadmap

### Market Prioritization

| Priority | Market | Timeline | Strategy |
|----------|--------|----------|----------|
| **P0** | Kenya | Launch | Home market |
| **P0** | Nigeria | Launch | Largest population |
| **P1** | South Africa | Month 3 | Premium market |
| **P1** | Ghana | Month 4 | English-speaking |
| **P2** | Tanzania | Month 6 | Swahili expansion |
| **P2** | Uganda | Month 6 | East Africa hub |
| **P3** | UK (Diaspora) | Month 8 | Premium diaspora |
| **P3** | US (Diaspora) | Month 10 | Largest diaspora |
| **P4** | France | Month 12 | Francophone Africa |

### Market Readiness Checklist

```
Per-Market Launch Checklist:

Legal & Compliance
├── [ ] Register business entity (if required)
├── [ ] Data protection registration
├── [ ] Terms of Service localized
├── [ ] Privacy Policy compliant
└── [ ] Content licenses valid

Payments
├── [ ] Local payment methods integrated
├── [ ] Pricing localized
├── [ ] Tax compliance
└── [ ] Payout methods for creators

Content
├── [ ] Minimum 10 localized series
├── [ ] Subtitles in local language
├── [ ] Local content partnerships
└── [ ] Content moderation for local norms

Marketing
├── [ ] Local social media presence
├── [ ] Local influencer partnerships
├── [ ] PR/media relationships
└── [ ] Localized app store listing
```

---

## 💳 Payment Methods by Region

### Africa

| Country | Primary | Secondary | Processing |
|---------|---------|-----------|------------|
| **Kenya** | M-Pesa | Cards | Flutterwave |
| **Nigeria** | Cards, Bank Transfer | USSD | Flutterwave |
| **South Africa** | Cards | EFT, SnapScan | Stripe |
| **Ghana** | Mobile Money | Cards | Flutterwave |
| **Tanzania** | M-Pesa, Tigo Pesa | Cards | Flutterwave |
| **Uganda** | MTN Money, Airtel | Cards | Flutterwave |

### International

| Region | Primary | Secondary | Processing |
|--------|---------|-----------|------------|
| **UK** | Cards | Apple Pay | Stripe |
| **US** | Cards | Apple Pay, Google Pay | Stripe |
| **EU** | Cards, SEPA | iDEAL, Bancontact | Stripe |
| **France** | Cards | Carte Bancaire | Stripe |

### Integration Requirements

**M-Pesa (Kenya):**
```
Requirements:
├── Paybill number registration
├── API integration (Daraja)
├── Callback URL setup
├── Transaction limits compliance
└── Customer support for M-Pesa issues

Flow:
1. User initiates payment
2. Push STK to user's phone
3. User enters PIN
4. Callback confirms payment
5. Credit coins to account
```

**Flutterwave (Pan-African):**
```
Supported Methods:
├── Cards (Mastercard, Visa)
├── Mobile Money (multiple providers)
├── Bank transfers
├── USSD
└── Barter (Flutterwave wallet)

Integration:
1. Flutterwave Standard checkout
2. Webhook for payment confirmation
3. Auto-retry for failed payments
```

---

## 🗣 Language Support

### Supported Languages

| Language | Priority | Coverage | Status |
|----------|----------|----------|--------|
| English | P0 | 100% | ✅ Live |
| Swahili | P1 | 80% | 🔄 In Progress |
| French | P1 | 60% | 📅 Planned |
| Yoruba | P2 | 40% | 📅 Planned |
| Hausa | P2 | 40% | 📅 Planned |
| Zulu | P2 | 40% | 📅 Planned |
| Portuguese | P3 | 30% | 📅 Future |
| Arabic | P3 | 30% | 📅 Future |

### Translation Scope

| Category | Word Count | Priority |
|----------|------------|----------|
| App UI | ~2,000 | P0 |
| Help Center | ~5,000 | P1 |
| Email Templates | ~3,000 | P1 |
| Marketing | ~2,000 | P1 |
| Legal Documents | ~10,000 | P0 |

### Localization Process

```
Translation Workflow:

1. Content Extraction
   ├── Extract strings from codebase
   ├── Export to translation management
   └── Context notes for translators

2. Translation
   ├── Professional translators (native)
   ├── Review by second translator
   └── Cultural adaptation

3. Integration
   ├── Import translations
   ├── QA testing in-app
   └── Screenshot validation

4. Launch
   ├── A/B test with users
   ├── Gather feedback
   └── Iterate

Tools:
├── i18next (Frontend)
├── Lokalise/Phrase (Management)
└── Crowdin (Community translations)
```

### Content Localization

**Subtitle Standards:**
- Maximum 2 lines
- 42 characters per line
- Minimum 1 second display
- Proper cultural adaptation (not literal)

**Dubbing Guidelines:**
- Native speakers only
- Match emotional tone
- Lip-sync quality (for premium)
- Consistent voice actors per series

---

## 💰 Regional Pricing

### Pricing Strategy

**Approach:** Purchasing Power Parity (PPP)

| Market | PPP Factor | Base Price | Local Price |
|--------|------------|------------|-------------|
| US | 1.0x | $4.99 | $4.99 |
| UK | 0.9x | $4.99 | £3.99 |
| Nigeria | 0.3x | $4.99 | ₦2,000 |
| Kenya | 0.35x | $4.99 | KES 500 |
| South Africa | 0.4x | $4.99 | R80 |

### Coin Package Pricing by Region

**Kenya (KES):**
| Package | Coins | Price |
|---------|-------|-------|
| Starter | 100 | KES 100 |
| Popular | 300 | KES 250 |
| Value | 600 | KES 450 |
| Best Deal | 1,200 | KES 800 |

**Nigeria (NGN):**
| Package | Coins | Price |
|---------|-------|-------|
| Starter | 100 | ₦500 |
| Popular | 300 | ₦1,200 |
| Value | 600 | ₦2,200 |
| Best Deal | 1,200 | ₦4,000 |

**South Africa (ZAR):**
| Package | Coins | Price |
|---------|-------|-------|
| Starter | 100 | R20 |
| Popular | 300 | R50 |
| Value | 600 | R90 |
| Best Deal | 1,200 | R160 |

---

## 📱 App Store Localization

### Per-Market Listings

**Required Elements:**
- App name (localized if appropriate)
- Subtitle/short description
- Full description
- Keywords
- Screenshots (localized text overlays)
- Preview video (subtitled)

### Category Selection by Market

| Market | Primary Category | Secondary |
|--------|------------------|-----------|
| Global | Entertainment | Lifestyle |
| Nigeria | Entertainment | Books |
| Kenya | Entertainment | Lifestyle |
| SA | Entertainment | Photo & Video |

---

## 🏢 Legal by Region

### Entity Structure

| Market | Entity Type | Registration |
|--------|-------------|--------------|
| Kenya | LLC | Business Registration Service |
| Nigeria | LLC | CAC |
| South Africa | Pty Ltd | CIPC |
| UK | Ltd | Companies House |
| US | LLC | Delaware |

### Data Protection

| Region | Law | Requirements |
|--------|-----|--------------|
| Kenya | DPA 2019 | Register with ODPC |
| Nigeria | NDPR | NITDA compliance |
| South Africa | POPIA | Information Officer |
| EU | GDPR | DPO, SCCs for transfers |
| UK | UK GDPR | ICO registration |

### Content Regulations

| Market | Rating System | Requirements |
|--------|---------------|--------------|
| Kenya | KFCB | Content rating certificate |
| Nigeria | NFVCB | Classification approval |
| South Africa | FPB | Age classification |
| Global | Self-rated | IARC questionnaire |

---

## 📊 Market-Specific KPIs

### Key Metrics by Market

| Metric | Kenya | Nigeria | SA | UK |
|--------|-------|---------|-----|-----|
| Target MAU (Y1) | 200K | 300K | 100K | 50K |
| ARPU Target | $1.50 | $1.20 | $2.50 | $4.00 |
| CAC Target | $0.30 | $0.25 | $0.50 | $1.00 |
| D7 Retention | 30% | 28% | 32% | 35% |

### Success Criteria per Launch

```
Month 1 Post-Launch:
├── 10,000 downloads
├── 5,000 registered users
├── 1,000 DAU
├── 100 paying users
└── $500 revenue

Month 3 Post-Launch:
├── 50,000 downloads
├── 30,000 registered users
├── 5,000 DAU
├── 1,500 paying users
└── $5,000 revenue
```

---

## 🤝 Local Partnerships

### Partnership Types

| Type | Purpose | Examples |
|------|---------|----------|
| Telco | Distribution, billing | Safaricom, MTN |
| Media | Content, promotion | Local studios |
| Payment | Local methods | M-Pesa, Paystack |
| Marketing | Influencers, media | Local agencies |

### Telco Partnership Model

```
Telco Bundle Structure:

Option A: Data Bundle + Kona
├── 1GB data + 100 Kona coins
├── Price: KES 200
├── Revenue split: 70/30 (Telco/Kona)
└── Promotion: Telco handles

Option B: Subscription via Carrier Billing
├── VIP subscription charged to airtime
├── Price: KES 500/month
├── Revenue split: 60/40 (Kona/Telco)
└── Distribution: Telco app/USSD

Option C: Zero-Rating
├── Kona traffic doesn't count against data
├── Cost: $X per GB to Kona
├── Benefit: Reduced barrier to use
└── Negotiation: Volume commitments
```

---

## 📅 Expansion Timeline

### Year 1 Rollout

```
Q1 (Months 1-3):
├── Kenya: Launch ✓
├── Nigeria: Launch ✓
└── Focus: Core markets, fix bugs

Q2 (Months 4-6):
├── South Africa: Launch
├── Ghana: Launch
├── Tanzania: Soft launch
└── Focus: Expand content library

Q3 (Months 7-9):
├── Uganda: Launch
├── UK Diaspora: Launch
├── French content: Begin
└── Focus: Diaspora market

Q4 (Months 10-12):
├── US Diaspora: Launch
├── Francophone Africa: Prep
├── New languages: Add 2
└── Focus: Scale winners
```

### Team for Expansion

| Role | Responsibility |
|------|----------------|
| Regional Manager | Market P&L, partnerships |
| Local Content | Content acquisition |
| Local Marketing | Marketing, influencers |
| Localization PM | Translations, cultural |
| Support Lead | Local language support |

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Payment failures | Revenue loss | Multiple providers |
| Content not resonating | Low engagement | Local content team |
| Regulatory issues | Fines, shutdown | Legal review before launch |
| Competition | User loss | First-mover advantage |
| Currency fluctuation | Revenue impact | Dynamic pricing |

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Owner:** International Team
