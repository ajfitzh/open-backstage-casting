import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Mail, Lock } from 'lucide-react';

export default function PrivacyPolicy() {
  const lastUpdated = "January 28, 2026"; // Update this date manually when you change the policy

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white font-bold tracking-tight">
            <Shield className="text-emerald-500" size={20} />
            <span>Open Backstage <span className="text-zinc-500 font-medium">Privacy</span></span>
          </div>
          <Link href="/" className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft size={14} /> Back to App
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Privacy Policy</h1>
          <p className="text-zinc-500 text-sm">Last Updated: {lastUpdated}</p>
        </div>

        <div className="space-y-12">
          
          {/* Section 1: Introduction */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              1. Introduction
            </h2>
            <p className="leading-relaxed text-zinc-400">
              Open Backstage ("we," "our," or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and safeguard your information when you use 
              our application tailored for CYT Fredericksburg. By accessing or using our Service, you agree 
              to the collection and use of information in accordance with this policy.
            </p>
          </section>

          {/* Section 2: Data Collection (Google OAuth Specifics) */}
          <section className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock size={18} className="text-emerald-500"/>
              2. Information We Collect
            </h2>
            <p className="mb-4 text-zinc-400">
              When you choose to sign in using <strong>Google OAuth</strong>, we collect the minimum amount of data required to create your account and verify your identity within our organization:
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <span className="text-zinc-300"><strong>Email Address:</strong> Used as your unique identifier and for system notifications.</span>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <span className="text-zinc-300"><strong>Full Name:</strong> Used to display your identity to stage managers and directors.</span>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                <span className="text-zinc-300"><strong>Profile Picture:</strong> Used for your user avatar within the dashboard.</span>
              </li>
            </ul>
          </section>

          {/* Section 3: How We Use Data */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <p className="leading-relaxed text-zinc-400 mb-4">
              We use the information we collect for the following specific purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-400 ml-2">
              <li>To provide, operate, and maintain the Open Backstage application.</li>
              <li>To match your account with existing family records in our production database.</li>
              <li>To manage cast and crew assignments, attendance, and production communication.</li>
              <li>To prevent fraudulent use of our services.</li>
            </ul>
          </section>

          {/* Section 4: Data Sharing */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Data Sharing & Disclosure</h2>
            <p className="leading-relaxed text-zinc-400">
              We do <strong>not</strong> sell, trade, or otherwise transfer your personally identifiable information to outside parties. 
              Your data is strictly used for internal organizational management within CYT Fredericksburg. 
              We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners and trusted affiliates.
            </p>
          </section>

          {/* Section 5: Data Security */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Data Retention & Deletion</h2>
            <p className="leading-relaxed text-zinc-400 mb-4">
              We retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. 
            </p>
            <p className="leading-relaxed text-zinc-400">
              <strong>Right to Delete:</strong> You have the right to request the deletion of your account and personal data. 
              If you wish to delete your data, please contact us at the email provided below, and we will remove your information from our active databases within 30 days.
            </p>
          </section>

          {/* Section 6: Contact */}
          <section className="border-t border-white/10 pt-8 mt-12">
            <h2 className="text-xl font-bold text-white mb-4">6. Contact Us</h2>
            <p className="text-zinc-400 mb-6">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="flex items-center gap-3 text-zinc-300 bg-zinc-900 w-fit px-4 py-3 rounded-xl border border-white/5">
              <Mail size={18} className="text-emerald-500" />
              <a href="mailto:database@cytfred.org" className="hover:text-white transition-colors">
                database@cytfred.org
              </a>
            </div>
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