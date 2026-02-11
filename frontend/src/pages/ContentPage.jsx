import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Users, Heart, Shield, Globe, Briefcase, Scale, Cookie, FileWarning, DollarSign, BookOpen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KonaLogo2Full } from "@/components/KonaLogo";
import SEO from "@/components/SEO";
import ReactMarkdown from "react-markdown";

// Page content definitions
const PAGE_CONTENT = {
  about: {
    title: "About Kona",
    icon: Heart,
    description: "Africa's premier mini-series streaming platform",
    content: `
# Our Story

Kona was founded in 2024 with a simple mission: **to bring African stories to the world**.

We noticed that while streaming platforms were booming globally, African content remained underrepresented. Local creators had incredible stories to tell but lacked the platform to reach audiences. Viewers craved content that reflected their experiences, cultures, and dreams.

So we built Kona.

## Our Mission

**To empower African storytellers and connect them with audiences worldwide through compelling short-form video content.**

We believe that:
- Every story deserves to be told
- African creators deserve fair compensation
- Viewers deserve content that resonates with their lives
- Entertainment should be accessible to everyone

## What We Offer

### For Viewers
- **500+ episodes** of exclusive African content
- **Diverse genres**: Romance, Drama, Thriller, Action, Comedy, Fantasy
- **Bite-sized entertainment**: Episodes are 3-15 minutes
- **Gamified experience**: Earn coins, compete, unlock rewards
- **Watch anywhere**: Mobile, tablet, desktop, offline

### For Creators
- **70% revenue share** - among the highest in the industry
- **Production support** and resources
- **Massive audience** - 1M+ active viewers
- **Analytics dashboard** to track performance
- **Creative freedom** to tell your stories

## Our Impact

Since launch, we've:
- Paid out **$500,000+** to African creators
- Produced **50+ original series**
- Reached viewers in **30+ countries**
- Created jobs for **200+ crew members**
- Supported **100+ independent creators**

## Leadership Team

Our team combines deep expertise in media, technology, and African markets:

- **CEO**: Former Netflix executive with 15 years in streaming
- **CTO**: Built scalable platforms serving 100M+ users
- **Creative Director**: Award-winning African filmmaker
- **Head of Creator Relations**: 10+ years supporting independent creators

## Our Values

1. **Creator First**: We exist to serve creators
2. **Authenticity**: Real African stories, not stereotypes
3. **Accessibility**: Entertainment for everyone, regardless of income
4. **Innovation**: Always improving the experience
5. **Community**: Building connections through shared stories

## Join Us

Whether you're a viewer looking for fresh content or a creator with stories to share, we'd love to have you.

**Start watching free today** or **apply to become a creator**.
    `,
  },
  careers: {
    title: "Careers at Kona",
    icon: Briefcase,
    description: "Join us in revolutionizing African entertainment",
    content: `
# Join Our Team

We're building the future of African entertainment, and we need passionate people to help us get there.

## Why Work at Kona?

### Impact
Your work will directly impact millions of viewers and hundreds of creators across Africa and beyond.

### Growth
We're growing fast. Join early and grow with us. Many of our early employees now lead major departments.

### Culture
We're remote-first, diverse, and believe in work-life balance. We judge by results, not hours.

### Compensation
Competitive salaries, equity options, health insurance, and generous PTO.

## Open Positions

### Engineering
- **Senior Backend Engineer** (Python/FastAPI) - Remote
- **Frontend Engineer** (React) - Remote
- **Mobile Engineer** (React Native) - Remote
- **DevOps Engineer** - Remote
- **Data Engineer** - Remote

### Product
- **Product Manager** - Nairobi/Remote
- **UX Designer** - Remote
- **UX Researcher** - Remote

### Content
- **Content Acquisitions Manager** - Lagos
- **Creator Success Manager** - Nairobi
- **Content Moderator** - Remote

### Marketing
- **Growth Marketing Manager** - Remote
- **Social Media Manager** - Remote
- **Influencer Partnerships** - Lagos/Nairobi

### Operations
- **Customer Support Lead** - Nairobi
- **Finance Manager** - Nairobi
- **HR Manager** - Remote

## Benefits

- 💰 Competitive salary + equity
- 🏥 Health insurance (medical, dental, vision)
- 🏖️ Unlimited PTO
- 🏠 Remote-first culture
- 💻 Home office budget
- 📚 Learning & development budget
- 👶 Parental leave
- 🎬 Free VIP subscription

## Our Hiring Process

1. **Application Review** (1 week)
2. **Initial Call** with recruiter (30 min)
3. **Skills Assessment** - Take-home or live (1-2 hours)
4. **Team Interviews** (2-3 rounds)
5. **Final Interview** with leadership
6. **Offer!**

We aim to complete the process in 2-3 weeks.

## How to Apply

Send your resume and a brief note about why you're excited about Kona to:

**careers@streamkona.com**

Don't see a perfect fit? Send us your info anyway - we're always looking for exceptional people.
    `,
  },
  press: {
    title: "Press & Media",
    icon: Globe,
    description: "News, press releases, and media resources",
    content: `
# Press & Media

## About Kona

Kona is Africa's premier mini-series streaming platform, offering exclusive short-form content created by African filmmakers for global audiences.

## Quick Facts

- **Founded**: 2024
- **Headquarters**: Nairobi, Kenya
- **Offices**: Lagos, Nigeria | Johannesburg, South Africa
- **Users**: 1M+ active viewers
- **Content**: 500+ episodes, 50+ original series
- **Creators**: 100+ independent filmmakers
- **Countries**: Available in 30+ countries

## Recent News

### February 2026
**Kona Raises $10M Series A**
Led by African-focused VC firm with participation from global media investors.

### January 2026
**Kona Launches VIP Tier**
Premium subscription offering offline viewing and exclusive content.

### December 2025
**Creator Payouts Exceed $500K**
Milestone reached in payments to African content creators.

## Press Releases

- [Kona Series A Announcement](/press/series-a)
- [2025 Year in Review](/press/2025-review)
- [Creator Fund Launch](/press/creator-fund)

## Media Kit

Download our media kit including:
- High-resolution logos
- Executive headshots
- Product screenshots
- Brand guidelines

[Download Media Kit](#)

## Press Contact

For press inquiries:

**Email**: press@streamkona.com

**Response Time**: 24-48 hours

Please include:
- Your publication/outlet
- Story deadline
- Specific questions or interview requests

## Speaking & Events

Our leadership team is available for:
- Industry conferences
- Podcast interviews
- Panel discussions
- University talks

Contact: events@streamkona.com
    `,
  },
  safety: {
    title: "Safety Center",
    icon: Shield,
    description: "Your safety is our priority",
    content: `
# Safety Center

At Kona, your safety is our top priority. We've built multiple layers of protection to ensure a safe viewing experience.

## Content Safety

### Age Ratings
All content is rated to help you make informed viewing choices:
- **G** - General audiences
- **PG** - Parental guidance suggested
- **13+** - Teen and above
- **16+** - Mature content
- **18+** - Adult content (requires age verification)

### Content Moderation
- All content reviewed before publishing
- AI-powered detection of harmful content
- 24/7 human moderation team
- Quick response to user reports

### Parental Controls
- Set PIN for mature content
- Create kids profiles with restricted content
- View watch history
- Set daily viewing limits

## Account Safety

### Secure Authentication
- Email and phone verification
- Two-factor authentication (2FA)
- Secure password requirements
- Session management

### Privacy Controls
- Control who sees your profile
- Manage watch history visibility
- Data download available
- Account deletion option

## Reporting Issues

### Report Content
See something concerning? Report it:
1. Tap the flag icon on any content
2. Select the reason
3. Add details (optional)
4. Submit

We review all reports within 24 hours.

### Report Users
If another user is behaving inappropriately:
1. Go to their profile
2. Tap "Report User"
3. Select the violation type
4. Submit

### Emergency Situations
If you see content depicting:
- Child exploitation
- Imminent violence
- Self-harm

Please report immediately AND contact local authorities.

## Our Commitments

1. **No tolerance** for illegal content
2. **24-hour response** to safety reports
3. **Transparent** moderation policies
4. **User privacy** protection
5. **Regular safety** audits

## Resources

- [Community Guidelines](/guidelines)
- [Privacy Policy](/privacy)
- [Terms of Service](/terms)
- [Contact Safety Team](mailto:safety@streamkona.com)
    `,
  },
  guidelines: {
    title: "Community Guidelines",
    icon: Users,
    description: "Rules for a positive community experience",
    content: `
# Community Guidelines

Kona is a community of millions of viewers and creators. These guidelines help us maintain a positive, safe, and welcoming environment for everyone.

## For All Users

### Be Respectful
- Treat others with kindness
- No harassment, bullying, or hate speech
- Respect diverse perspectives and cultures
- Keep discussions constructive

### Be Honest
- Don't impersonate others
- Don't spread misinformation
- Don't manipulate ratings or reviews
- Don't create fake accounts

### Be Safe
- Don't share personal information publicly
- Report suspicious activity
- Keep your account secure
- Protect minors

## Content Guidelines (Creators)

### Allowed Content
- Original creative works
- Licensed or public domain content
- Educational and informative content
- Entertainment across all genres

### Prohibited Content
- **Violence**: Graphic violence, gore, torture
- **Sexual content**: Pornography, explicit sexual acts
- **Hate**: Content promoting hatred against groups
- **Illegal**: Drug trafficking, weapons, fraud
- **Harmful**: Self-harm promotion, dangerous challenges
- **Misinformation**: Medical or election misinformation
- **Copyright**: Unauthorized use of others' content
- **Spam**: Repetitive, misleading, or low-quality content

### Age-Restricted Content
Content with the following may be age-restricted:
- Moderate violence
- Sexual themes (non-explicit)
- Drug or alcohol references
- Strong language

## Engagement Guidelines

### Comments & Reviews
- Stay on topic
- Be constructive, not destructive
- No spam or self-promotion
- No spoilers without warnings

### Watch Parties
- Follow the host's rules
- Keep chat family-friendly unless marked otherwise
- Don't share party links publicly

## Enforcement

Violations result in:

1. **Warning** - First minor offense
2. **Content Removal** - Violating content removed
3. **Temporary Suspension** - Repeated violations
4. **Permanent Ban** - Severe or continued violations

Severe violations (illegal content, exploitation) result in immediate permanent ban and may be reported to authorities.

## Appeals

Disagree with an enforcement action?
1. Go to Settings > Appeals
2. Explain your case
3. We'll review within 7 days

## Updates

These guidelines may be updated. We'll notify users of significant changes.

*Last updated: February 2026*
    `,
  },
  accessibility: {
    title: "Accessibility",
    icon: Star,
    description: "Kona for everyone",
    content: `
# Accessibility at Kona

We believe entertainment should be accessible to everyone. We're committed to making Kona usable for people of all abilities.

## Current Features

### Visual Accessibility
- **High contrast mode**: Enhanced visibility
- **Font size controls**: Adjust text size
- **Screen reader support**: Compatible with VoiceOver, TalkBack
- **Alt text**: Descriptions for images
- **Color blind modes**: Deuteranopia, protanopia, tritanopia

### Audio Accessibility
- **Subtitles**: Available on all content
- **Closed captions**: Including sound descriptions
- **Audio descriptions**: Narration of visual elements
- **Volume controls**: Per-content volume adjustment

### Motor Accessibility
- **Keyboard navigation**: Full keyboard support
- **Voice commands**: Control playback by voice
- **Large touch targets**: Easy to tap on mobile
- **Reduced motion**: Option to minimize animations

### Cognitive Accessibility
- **Simple navigation**: Intuitive interface
- **Clear labels**: Descriptive buttons and links
- **Consistent layout**: Predictable structure
- **Reading level**: Plain language used

## How to Enable

### On Mobile App
1. Go to Profile > Settings
2. Tap "Accessibility"
3. Enable desired features

### On Web
1. Click your profile icon
2. Select "Settings"
3. Go to "Accessibility"
4. Customize your experience

## Requesting Accommodations

Need an accommodation we don't currently offer?

Email: accessibility@streamkona.com

We review all requests and prioritize based on impact.

## Feedback

We're always improving. Tell us how we can do better:

- What's working well?
- What's difficult to use?
- What features would help?

Your feedback directly shapes our roadmap.

## Standards

We aim to meet:
- WCAG 2.1 Level AA
- Section 508 compliance
- EN 301 549 (EU)

## Roadmap

Coming soon:
- Sign language interpretation for select content
- Enhanced audio description library
- Customizable playback speeds
- Dyslexia-friendly font option

*This page is regularly updated as we improve accessibility.*
    `,
  },
  terms: {
    title: "Terms of Service",
    icon: Scale,
    description: "Terms governing your use of Kona",
    content: `
# Terms of Service

*Last Updated: February 1, 2026*

Welcome to Kona! These Terms of Service ("Terms") govern your use of the Kona streaming platform.

## 1. Acceptance of Terms

By accessing or using Kona, you agree to be bound by these Terms. If you disagree, please do not use our service.

## 2. Eligibility

- You must be at least 13 years old
- If under 18, you need parental consent
- You must not be prohibited from using our service by law

## 3. Account Registration

- Provide accurate information
- Keep your password secure
- You're responsible for all activity on your account
- One account per person

## 4. Subscriptions and Payments

### Free Tier
- Access to first episodes
- Earn coins through rewards
- Ad-supported viewing

### Paid Subscriptions
- Billed monthly
- Auto-renews unless cancelled
- Cancel anytime
- No refunds for partial months

### Coins
- Virtual currency for unlocking content
- No cash value
- Non-transferable
- May expire (see coin terms)

## 5. Content and Conduct

### You May
- Stream content for personal use
- Share your opinion in reviews
- Participate in community features

### You May Not
- Download content without permission
- Share your account
- Circumvent access controls
- Use VPN to access geo-restricted content
- Scrape or data mine our platform
- Harass other users
- Post illegal content

## 6. Intellectual Property

- All content is owned by Kona or our licensors
- You receive a limited license to stream
- You may not reproduce, distribute, or create derivative works

## 7. User Content

- You retain rights to content you upload
- You grant us license to display your content
- You're responsible for your content
- We may remove violating content

## 8. Disclaimers

- Service provided "as is"
- We don't guarantee uninterrupted access
- Content may be added or removed
- Prices may change

## 9. Limitation of Liability

To the maximum extent permitted by law, Kona is not liable for:
- Indirect or consequential damages
- Loss of data or profits
- Service interruptions

## 10. Termination

- You may close your account anytime
- We may suspend or terminate for violations
- Upon termination, your licenses end

## 11. Changes to Terms

- We may update these Terms
- Continued use means acceptance
- Material changes will be notified

## 12. Governing Law

These Terms are governed by the laws of Kenya. Disputes will be resolved in Nairobi courts.

## 13. Contact

Questions about these Terms?

Email: legal@streamkona.com

---

By using Kona, you acknowledge that you have read and understood these Terms.
    `,
  },
  privacy: {
    title: "Privacy Policy",
    icon: Shield,
    description: "How we collect, use, and protect your data",
    content: `
# Privacy Policy

*Last Updated: February 1, 2026*

This Privacy Policy explains how Kona Entertainment Ltd. ("Kona," "we," "us") collects, uses, and protects your personal information.

## 1. Information We Collect

### Information You Provide
- Account info (email, phone, name)
- Payment information
- Profile details
- Communications with us
- User-generated content

### Information Collected Automatically
- Device information
- IP address and location
- Viewing history
- Interaction data
- Cookies and similar technologies

### Information from Third Parties
- Social media (if you connect accounts)
- Payment processors
- Analytics providers

## 2. How We Use Your Information

- Provide and improve our service
- Process payments
- Personalize recommendations
- Send notifications and updates
- Prevent fraud and abuse
- Comply with legal obligations
- Analyze usage patterns
- Marketing (with your consent)

## 3. How We Share Your Information

### We May Share With
- **Service providers**: Payment, hosting, analytics
- **Business partners**: Content partners (aggregated data only)
- **Legal authorities**: When required by law
- **Affiliates**: Within Kona group companies

### We Never
- Sell your personal data
- Share viewing history with advertisers
- Give third parties direct access to your data

## 4. Data Retention

- Account data: Until you delete your account
- Viewing history: 2 years
- Payment records: 7 years (legal requirement)
- Anonymous analytics: Indefinitely

## 5. Your Rights

You have the right to:
- **Access** your data
- **Correct** inaccurate data
- **Delete** your data
- **Export** your data
- **Opt out** of marketing
- **Withdraw consent**

To exercise these rights, go to Settings > Privacy or contact privacy@streamkona.com

## 6. Cookies

We use cookies for:
- Essential functionality
- Remembering preferences
- Analytics
- Personalization

Manage cookies in Settings > Privacy > Cookie Preferences

## 7. Security

We protect your data with:
- Encryption in transit and at rest
- Regular security audits
- Access controls
- Employee training

## 8. Children's Privacy

- Service not intended for under 13
- We don't knowingly collect children's data
- Parents can request deletion of child's data

## 9. International Transfers

Your data may be processed in:
- Kenya (primary)
- United States (cloud services)
- European Union (backup)

We use appropriate safeguards for transfers.

## 10. Changes to This Policy

We may update this policy. Material changes will be notified via email or in-app notification.

## 11. Contact Us

**Data Protection Officer**
Email: privacy@streamkona.com
Address: Kona Entertainment Ltd., Westlands, Nairobi, Kenya

For EU residents: You may contact our EU representative at eu-privacy@streamkona.com
    `,
  },
  cookies: {
    title: "Cookie Policy",
    icon: Cookie,
    description: "How we use cookies and similar technologies",
    content: `
# Cookie Policy

*Last Updated: February 1, 2026*

This policy explains how Kona uses cookies and similar technologies.

## What Are Cookies?

Cookies are small text files stored on your device when you visit websites. They help us:
- Remember your preferences
- Keep you signed in
- Understand how you use our service
- Improve your experience

## Types of Cookies We Use

### Essential Cookies
**Required for the service to function**
- Authentication
- Security
- Load balancing
- Accessibility preferences

*Cannot be disabled*

### Functional Cookies
**Remember your choices**
- Language preference
- Video quality settings
- Playback position
- UI preferences

*Can be disabled, may affect functionality*

### Analytics Cookies
**Help us understand usage**
- Pages visited
- Time on site
- Click patterns
- Error occurrences

*Can be disabled*

### Marketing Cookies
**Used for relevant content suggestions**
- Viewing history
- Genre preferences
- Search queries

*Can be disabled*

## Similar Technologies

### Local Storage
Stores data in your browser:
- Offline content
- Cache data
- Session information

### Pixels/Beacons
Small images that track:
- Email opens
- Page visits

### Device Fingerprinting
We do NOT use device fingerprinting.

## Third-Party Cookies

Some third parties may set cookies:
- **Google Analytics**: Usage statistics
- **Payment providers**: Transaction security
- **Social media**: Share buttons (only if you interact)

## Managing Cookies

### In Kona App
Settings > Privacy > Cookie Preferences

### In Browser
- **Chrome**: Settings > Privacy > Cookies
- **Safari**: Preferences > Privacy
- **Firefox**: Options > Privacy
- **Edge**: Settings > Privacy

### Opt-Out Links
- [Google Analytics Opt-Out](https://tools.google.com/dlpage/gaoptout)

## Cookie Duration

- **Session cookies**: Deleted when you close browser
- **Persistent cookies**: Up to 2 years

## Changes

We may update this policy. Check back periodically.

## Contact

Questions? Email: privacy@streamkona.com
    `,
  },
  dmca: {
    title: "DMCA & Copyright",
    icon: FileWarning,
    description: "Copyright infringement reporting",
    content: `
# DMCA & Copyright Policy

Kona respects intellectual property rights and expects our users to do the same.

## Copyright Infringement

If you believe content on Kona infringes your copyright, you may submit a DMCA takedown notice.

## Filing a DMCA Notice

To file a notice, provide:

1. **Your contact information**
   - Full legal name
   - Address
   - Phone number
   - Email address

2. **Identification of copyrighted work**
   - Description of the work
   - Link to original (if online)
   - Registration number (if registered)

3. **Identification of infringing content**
   - URL of content on Kona
   - Description of where it appears

4. **Statements**
   - "I have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law."
   - "The information in this notification is accurate, and under penalty of perjury, I am authorized to act on behalf of the copyright owner."

5. **Your signature**
   - Electronic or physical

## Where to Send

**Email**: dmca@streamkona.com

**Mail**:
Kona Entertainment Ltd.
Attn: DMCA Agent
P.O. Box 12345
Nairobi, Kenya

## Counter-Notification

If you believe your content was wrongly removed, you may file a counter-notification including:

1. Your contact information
2. Identification of removed content and its location
3. Statement under penalty of perjury that you have good faith belief the content was removed by mistake
4. Consent to jurisdiction of Nairobi courts
5. Your signature

## Repeat Infringers

We terminate accounts of repeat infringers:
- First offense: Warning
- Second offense: Account suspension
- Third offense: Permanent termination

## Creator Guidelines

For creators uploading content:
- Only upload content you own or have rights to
- Don't use copyrighted music without license
- Don't use footage from other films/shows
- Credit sources appropriately
- Obtain model/actor releases

## Resources

- [U.S. Copyright Office](https://www.copyright.gov)
- [WIPO](https://www.wipo.int)
- [Creative Commons](https://creativecommons.org)

## Questions

For copyright questions: copyright@streamkona.com
    `,
  },
  creators: {
    title: "Creator Portal",
    icon: Users,
    description: "Upload content and earn money",
    content: `
# Creator Portal

Share your stories with millions and earn money doing what you love.

## Why Create on Kona?

### Massive Reach
- **1M+ active viewers** hungry for African content
- **30+ countries** worldwide
- **Growing 20%** month over month

### Fair Compensation
- **70% revenue share** - highest in the industry
- **Monthly payouts** via M-Pesa, bank, or PayPal
- **Transparent analytics** - see exactly what you earn

### Full Support
- **Production resources** and guidance
- **Marketing support** for top performers
- **Creator community** to learn and connect
- **Dedicated success manager** for top creators

## Revenue Model

### How You Earn

1. **Coin Purchases**: When viewers buy coins to watch your content
2. **Subscriptions**: Share of subscriber revenue based on watch time
3. **Tips**: Direct tips from appreciative viewers
4. **Bonuses**: Performance bonuses for top content

### Example Earnings

| Views | Estimated Monthly Earnings |
|-------|---------------------------|
| 10,000 | $100 - $300 |
| 100,000 | $1,000 - $3,000 |
| 1,000,000 | $10,000 - $30,000 |

*Actual earnings vary based on viewer engagement and geography*

## Content Requirements

### Format
- **Video quality**: Minimum 720p HD
- **Audio**: Clear, balanced sound
- **Length**: 3-15 minutes per episode
- **Series**: Minimum 3 episodes

### Genres
We accept all genres:
- Romance
- Drama
- Thriller
- Action
- Comedy
- Fantasy
- Horror
- Documentary

### Standards
- Original content only
- No copyright violations
- No explicit sexual content
- No extreme violence
- Professional quality

## Application Process

### Step 1: Apply
Fill out the creator application form with:
- Your background and experience
- Series concept and synopsis
- Sample content (trailer or episode)

### Step 2: Review
Our team reviews applications weekly:
- Content quality assessment
- Concept evaluation
- Audience potential analysis

### Step 3: Onboarding
If approved:
- Sign creator agreement
- Set up payment details
- Access creator dashboard
- Upload your content

### Step 4: Launch
We help you launch:
- Optimize thumbnails and descriptions
- Feature in discovery sections
- Promote to relevant audiences

## Creator Dashboard

Track everything in your dashboard:
- **Views** and watch time
- **Revenue** and payouts
- **Audience** demographics
- **Content** performance
- **Comments** and engagement

## Success Stories

> "Kona changed my life. I was making content for YouTube with little return. On Kona, my first series earned $5,000 in the first month." - Amina K., Kenya

> "The support from Kona's team helped me improve my production quality. Now I create full-time." - Chidi O., Nigeria

## Ready to Start?

[Apply Now](/business/apply)

Questions? Email: creators@streamkona.com
    `,
  },
  "creator-guidelines": {
    title: "Creator Guidelines",
    icon: BookOpen,
    description: "Best practices for Kona creators",
    content: `
# Creator Guidelines

These guidelines help you create successful content on Kona.

## Content Quality

### Video
- **Resolution**: 1080p recommended, 720p minimum
- **Frame rate**: 24-30 fps
- **Format**: MP4 (H.264) preferred
- **Bitrate**: 5-10 Mbps

### Audio
- **Format**: AAC or MP3
- **Sample rate**: 48kHz
- **Bitrate**: 192kbps minimum
- **Levels**: -14 to -10 dB average

### Lighting
- Well-lit scenes
- Consistent lighting
- Avoid harsh shadows
- Natural light works great

## Storytelling Tips

### Hook Early
- Capture attention in first 30 seconds
- Start with action or intrigue
- Don't bury the lead

### Episode Structure
- Clear beginning, middle, end
- End with a hook for next episode
- Consistent episode length

### Characters
- Relatable protagonists
- Clear motivations
- Character development across series

### Pacing
- Keep it moving
- Every scene should advance story
- Cut unnecessary content

## Optimization

### Thumbnails
- High contrast
- Faces perform well
- Text should be readable
- Avoid clutter

### Titles
- Clear and descriptive
- Include genre keywords
- Avoid clickbait

### Descriptions
- Synopsis of episode
- No spoilers
- Include relevant tags

### Tags
- Genre tags
- Theme tags
- Mood tags
- 5-10 tags per episode

## Community Engagement

### Respond to Comments
- Engage with your audience
- Thank supporters
- Address concerns professionally

### Build Following
- Consistent upload schedule
- Tease upcoming content
- Cross-promote on social media

### Collaborate
- Work with other creators
- Cross-promote series
- Appear in each other's content

## What to Avoid

### Content
- Copyright violations
- Explicit content
- Hate speech
- Misinformation
- Low effort content

### Practices
- Sub4sub or artificial engagement
- Misleading thumbnails
- Spam
- Harassment

## Resources

- [Video Production Guide](#)
- [Thumbnail Templates](#)
- [Creator Community Forum](#)
- [Monthly Creator Webinars](#)

## Support

Need help? Contact your creator success manager or email creators@streamkona.com
    `,
  },
  revenue: {
    title: "Revenue Sharing",
    icon: DollarSign,
    description: "How creators earn on Kona",
    content: `
# Revenue Sharing

Transparent, fair compensation for creators.

## Revenue Split

### Standard Split
- **Creators**: 70%
- **Kona**: 30%

This is among the highest creator share in the industry.

### What Kona's 30% Covers
- Platform infrastructure
- Payment processing (3-5%)
- Content delivery
- Marketing and promotion
- Customer support
- Moderation and safety

## Revenue Sources

### 1. Coin Purchases (Primary)
When viewers spend coins on your content:
- You earn 70% of the coin value
- Tracked per-episode

### 2. Subscription Share
For Premium/VIP subscribers:
- Revenue pooled monthly
- Distributed based on watch time
- More watch time = higher share

### 3. Tips
Viewers can tip directly:
- You keep 85% of tips
- 15% for payment processing

### 4. Bonuses
Performance rewards:
- Top 10 series monthly bonus
- Viral content bonus
- New creator launch bonus

## Payment Schedule

### Timing
- Payouts processed **1st of each month**
- For previous month's earnings
- Arrives within 3-5 business days

### Minimum Payout
- **$50 USD** minimum
- Below minimum rolls over to next month

### Payment Methods
- M-Pesa (Kenya, Tanzania)
- Bank transfer (all countries)
- PayPal (all countries)
- Wise (international)

## Tracking Earnings

### Creator Dashboard
View in real-time:
- Daily/weekly/monthly revenue
- Revenue by episode
- Revenue by source
- Pending vs. paid

### Reports
Download detailed reports:
- Transaction history
- Tax documents (1099/W-8)
- Revenue breakdowns

## Tax Information

### Your Responsibility
- You're responsible for your taxes
- We provide necessary documentation
- Consult a tax professional

### Documents We Provide
- Annual earnings summary
- Transaction records
- Tax forms (where required)

## FAQs

**Q: When do I start earning?**
A: As soon as your content is live and viewers watch/purchase.

**Q: Why is my payout less than expected?**
A: Payment fees (3-5%) and tax withholding (if applicable) may apply.

**Q: Can I earn from old content?**
A: Yes! Your content continues earning as long as it's on the platform.

**Q: What if I don't reach minimum payout?**
A: Balance rolls over until you reach $50.

## Support

Payment questions? Email: payments@streamkona.com
    `,
  },
};

const ContentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get page ID from path (e.g., /careers -> careers)
  const pageId = location.pathname.replace('/', '');
  
  const page = PAGE_CONTENT[pageId];
  
  if (!page) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Page Not Found</h1>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const Icon = page.icon;

  return (
    <div className="min-h-screen bg-[#030014]" data-testid={`page-${pageId}`}>
      <SEO title={`${page.title} - Kona`} description={page.description} />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#030014]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">{page.title}</h1>
                <p className="text-xs text-gray-400">{page.description}</p>
              </div>
            </div>
          </div>
          <button onClick={() => navigate("/")} className="hidden sm:block">
            <KonaLogo2Full height={24} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <article className="prose prose-invert prose-purple max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-xl prose-p:text-gray-300 prose-li:text-gray-300 prose-strong:text-white prose-a:text-purple-400">
          <ReactMarkdown>{page.content}</ReactMarkdown>
        </article>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white text-sm">
            ← Back to Kona
          </button>
          <p className="text-gray-500 text-sm">© 2026 Kona Entertainment Ltd.</p>
        </div>
      </footer>
    </div>
  );
};

export default ContentPage;
