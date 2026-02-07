import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KonaLogo2Full } from "@/components/KonaLogo";

export const TermsPage = () => {
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
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Stream Kona ("Kona," "we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service. Kona is a streaming platform that provides access to African mini-series and original content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">2. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 13 years old to use Kona. If you are under 18, you must have parental or guardian consent. By using our service, you represent that you meet these requirements and have the legal capacity to enter into this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To access certain features, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">4. Kona Coins & Payments</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Kona uses a virtual currency system ("Coins") to unlock premium content:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Coins can be purchased using mobile money (M-Pesa, MTN MoMo, Airtel Money) or card payments</li>
              <li>Coins are non-refundable and cannot be exchanged for cash</li>
              <li>Coins do not expire as long as your account remains active</li>
              <li>Unused coins may be forfeited if your account is terminated for violations</li>
              <li>Prices are displayed in your local currency where available</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">5. Content & Licensing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All content on Kona, including videos, images, text, and graphics, is owned by Kona or our content partners:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>You are granted a limited, non-exclusive license to stream content for personal, non-commercial use</li>
              <li>You may not download, copy, distribute, or share content without authorization</li>
              <li>Screen recording or capturing of content is prohibited</li>
              <li>Content availability may vary by region and is subject to change</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">6. Creator Program</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you participate in the Kona Creator Program:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>You must own or have rights to all content you upload</li>
              <li>You grant Kona a worldwide license to distribute your content</li>
              <li>Revenue sharing is subject to the Creator Partnership Agreement</li>
              <li>Content must comply with our Community Guidelines</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">7. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Share your account credentials with others</li>
              <li>Use VPNs or proxies to circumvent regional restrictions</li>
              <li>Attempt to hack, reverse engineer, or disrupt our service</li>
              <li>Upload malicious content or spam</li>
              <li>Harass other users or creators</li>
              <li>Use automated systems or bots to access the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">8. VIP Subscriptions</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              VIP subscriptions provide additional benefits:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Subscriptions auto-renew unless cancelled before the renewal date</li>
              <li>You can cancel anytime through your account settings</li>
              <li>No refunds for partial subscription periods</li>
              <li>Benefits may vary and are subject to change with notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account at any time for violations of these terms or for any reason at our discretion. You may delete your account at any time through your profile settings. Upon termination, your license to use the service ends immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">10. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Kona is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. We will notify you of significant changes via email or through the app. Continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-white">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground mt-2">
              Email: <a href="mailto:legal@streamkona.com" className="text-primary hover:underline">legal@streamkona.com</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 Kona. All rights reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => navigate("/about")} className="hover:text-white">About Us</button>
            <button onClick={() => navigate("/terms")} className="hover:text-white text-white">Terms of Service</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-white">Privacy Policy</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
