import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KonaLogo2Full } from "@/components/KonaLogo";

export const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <KonaLogo2Full height={24} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Stream Kona ("Kona," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our streaming platform and services. By using Kona, you consent to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">2. Information We Collect</h2>
            
            <h3 className="text-lg font-medium mb-3 text-white/90">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
              <li><strong>Account Information:</strong> Name, email address, password, profile picture</li>
              <li><strong>Payment Information:</strong> Mobile money number, payment method details (processed securely by our payment partners)</li>
              <li><strong>Communications:</strong> Messages you send to our support team or other users</li>
              <li><strong>Creator Content:</strong> Videos, descriptions, and metadata you upload as a creator</li>
            </ul>

            <h3 className="text-lg font-medium mb-3 text-white/90">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Device Information:</strong> Device type, operating system, browser type, unique device identifiers</li>
              <li><strong>Usage Data:</strong> Watch history, search queries, interactions with content, time spent on the platform</li>
              <li><strong>Location Data:</strong> Country and region based on IP address (for content availability and payment localization)</li>
              <li><strong>Cookies:</strong> Session cookies and persistent cookies for authentication and preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide, maintain, and improve our streaming service</li>
              <li>Process payments and manage your coin balance</li>
              <li>Personalize your experience with content recommendations</li>
              <li>Send important account notifications and updates</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Detect and prevent fraud, abuse, and security threats</li>
              <li>Analyze usage patterns to improve our platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">4. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Payment Processors:</strong> To process coin purchases and subscriptions (M-Pesa, MTN MoMo, Flutterwave, Stripe)</li>
              <li><strong>Content Partners:</strong> Aggregated viewership data (not personally identifiable)</li>
              <li><strong>Service Providers:</strong> Cloud hosting, analytics, and customer support tools</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-4">
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Secure password hashing</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls and authentication</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">6. Your Rights & Choices</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Data Portability:</strong> Receive your data in a portable format</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, contact us at privacy@streamkona.com or through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">7. Cookies & Tracking</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Keep you logged in to your account</li>
              <li>Remember your preferences and settings</li>
              <li>Analyze how you use our platform</li>
              <li>Deliver relevant content recommendations</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You can control cookies through your browser settings, but disabling them may affect functionality.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Kona is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately so we can delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">9. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">10. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide services. We may retain certain information for legal compliance, dispute resolution, or to enforce our agreements. Watch history and preferences are kept to improve your experience but can be cleared in your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the app. The "Last updated" date at the top indicates when this policy was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="mt-4 text-muted-foreground">
              <p>Email: <a href="mailto:privacy@streamkona.com" className="text-primary hover:underline">privacy@streamkona.com</a></p>
              <p className="mt-2">Data Protection Officer: <a href="mailto:dpo@streamkona.com" className="text-primary hover:underline">dpo@streamkona.com</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 Kona. All rights reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => navigate("/about")} className="hover:text-white">About Us</button>
            <button onClick={() => navigate("/terms")} className="hover:text-white">Terms of Service</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-white text-white">Privacy Policy</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPage;
