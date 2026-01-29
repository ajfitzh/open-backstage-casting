import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Scale, AlertCircle } from 'lucide-react';

export default function TermsOfService() {
  const lastUpdated = "January 28, 2026";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white font-bold tracking-tight">
            <Shield className="text-emerald-500" size={20} />
            <span>Open Backstage <span className="text-zinc-500 font-medium">Terms</span></span>
          </div>
          <Link href="/" className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> Back to App
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Terms of Service</h1>
          <p className="text-zinc-500 text-sm">Last Updated: {lastUpdated}</p>
        </div>

        <div className="space-y-12">
          
          {/* Section 1: Acceptance */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Scale size={18} className="text-emerald-500"/>
              1. Acceptance of Terms
            </h2>
            <p className="leading-relaxed text-zinc-400">
              By accessing and using <strong>Open Backstage</strong>, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services. These terms apply to all visitors, 
              users, and others who access or use the Service within the CYT Fredericksburg organization.
            </p>
          </section>

          {/* Section 2: Accounts */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. User Accounts</h2>
            <p className="leading-relaxed text-zinc-400 mb-4">
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. 
              Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                <h3 className="text-white font-bold text-sm mb-2">Your Responsibilities</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                    <li>• You are responsible for safeguarding the Google account you use to access the Service.</li>
                    <li>• You agree not to disclose your password to any third party.</li>
                    <li>• You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</li>
                </ul>
            </div>
          </section>

          {/* Section 3: Acceptable Use */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Acceptable Use</h2>
            <p className="leading-relaxed text-zinc-400 mb-2">
              You agree not to use the Service:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-2">
              <li>In any way that violates any applicable national or international law.</li>
              <li>To exploit, harm, or attempt to exploit or harm minors in any way.</li>
              <li>To transmit any unsolicited or unauthorized advertising (spam).</li>
              <li>To impersonate or attempt to impersonate CYT Fredericksburg staff, another user, or any other person or entity.</li>
            </ul>
          </section>

          {/* Section 4: Intellectual Property */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Intellectual Property</h2>
            <p className="leading-relaxed text-zinc-400">
              The Service and its original content (excluding Content provided by users), features, and functionality are and will remain 
              the exclusive property of Open Backstage and its licensors. The Service is protected by copyright, trademark, and other laws 
              of both the United States and foreign countries.
            </p>
          </section>

          {/* Section 5: Termination */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Termination</h2>
            <p className="leading-relaxed text-zinc-400">
              We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, 
              including without limitation if you breach the Terms. All provisions of the Terms which by their nature should survive 
              termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </section>

          {/* Section 6: Limitation of Liability */}
          <section className="bg-red-500/5 p-6 rounded-2xl border border-red-500/10">
            <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <AlertCircle size={18}/>
              6. Limitation of Liability
            </h2>
            <p className="leading-relaxed text-zinc-400 text-sm">
              In no event shall Open Backstage, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, 
              incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other 
              intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content 
              of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your 
              transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory.
            </p>
          </section>

           {/* Section 7: Changes */}
           <section>
            <h2 className="text-xl font-bold text-white mb-4">7. Changes</h2>
            <p className="leading-relaxed text-zinc-400">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to 
              provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
          </section>

          {/* Section 8: Contact */}
          <section className="border-t border-white/10 pt-8 mt-12">
            <h2 className="text-xl font-bold text-white mb-4">8. Contact Us</h2>
            <p className="text-zinc-400">
              If you have any questions about these Terms, please contact us at: 
              <a href="mailto:austin@cytfred.org" className="text-emerald-500 hover:text-emerald-400 ml-1 font-bold transition-colors">
                austin@cytfred.org
              </a>
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-zinc-600 text-xs">
          © {new Date().getFullYear()} Open Backstage. Built for CYT Fredericksburg.
        </p>
      </footer>
    </div>
  );
}