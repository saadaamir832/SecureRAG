import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  FileLock2,
  Lock,
  ScanSearch,
  Activity,
  Brain,
  Zap,
  ArrowRight,
  CheckCircle2,
  FileText,
  Search,
  Cpu,
  MessageSquare,
} from 'lucide-react';
import { CyberBackground } from '@/components/CyberBackground';

const securityBadges = [
  { label: 'Prompt Injection Protection', icon: Shield },
  { label: 'Access Control', icon: Lock },
  { label: 'Data Isolation', icon: FileLock2 },
  { label: 'Audit Logging', icon: Activity },
];

const features = [
  {
    icon: Shield,
    title: 'Prompt Injection Defense',
    desc: 'Multi-layer detection blocks direct and indirect prompt injection attempts before they reach the LLM.',
  },
  {
    icon: FileLock2,
    title: 'Secure Document Upload',
    desc: 'Strict file validation, MIME checking, blocked extensions, and path traversal protection on every upload.',
  },
  {
    icon: Lock,
    title: 'User Isolation',
    desc: 'Vector database retrieval is always scoped to the authenticated user. No cross-user data leakage.',
  },
  {
    icon: Zap,
    title: 'API Security',
    desc: 'Rate limiting, input validation, authorization checks, and safe error messages on every endpoint.',
  },
  {
    icon: Activity,
    title: 'Audit Logging',
    desc: 'Every security-relevant action is recorded — logins, queries, uploads, detections, and access attempts.',
  },
  {
    icon: ScanSearch,
    title: 'Threat Detection',
    desc: 'Real-time detection of injection attempts, unauthorized access, malicious uploads, and brute force attacks.',
  },
];

const architectureSteps = [
  { label: 'User', icon: FileText },
  { label: 'Authentication', icon: Lock },
  { label: 'Security Middleware', icon: Shield },
  { label: 'Document Processing', icon: FileLock2 },
  { label: 'Vector Database', icon: ScanSearch },
  { label: 'Secure Retrieval', icon: Search },
  { label: 'LLM Security Layer', icon: Brain },
  { label: 'Output Validation', icon: CheckCircle2 },
  { label: 'AI Response', icon: MessageSquare },
];

const pipelineSteps = [
  { label: 'Documents', icon: FileText },
  { label: 'Secure Retrieval', icon: Search },
  { label: 'AI', icon: Cpu },
  { label: 'Protected Answer', icon: ShieldCheck },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <CyberBackground />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0a0e17]/70 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-cyan-400" />
            <span className="text-xl font-bold tracking-tight">Secure<span className="gradient-text">RAG</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-300 hover:text-cyan-400 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-cyan-300 font-medium">Security-First RAG Platform</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              AI-Powered Knowledge.
              <br />
              <span className="gradient-text">Security-First by Design.</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-xl">
              Securely search, understand, and interact with your documents using Retrieval-Augmented Generation
              protected by modern application and LLM security controls.
            </p>
            <div className="flex flex-wrap gap-4 mb-12">
              <Link to="/register" className="btn-primary inline-flex items-center gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#security" className="btn-secondary inline-flex items-center gap-2">
                Explore Security
              </a>
            </div>

            {/* Security badges */}
            <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
              {securityBadges.map((badge, i) => (
                <motion.div
                  key={badge.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800/50"
                >
                  <badge.icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{badge.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Pipeline visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-card p-8 neon-border">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-slate-300">Secure RAG Pipeline</span>
                <StatusIndicator />
              </div>
              <div className="space-y-3">
                {pipelineSteps.map((step, i) => (
                  <div key={step.label}>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.15 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800/50"
                    >
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="text-sm text-slate-200 font-medium">{step.label}</span>
                      <div className="ml-auto">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400/60" />
                      </div>
                    </motion.div>
                    {i < pipelineSteps.length - 1 && (
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.6 + i * 0.15 }}
                        className="h-4 w-px bg-gradient-to-b from-cyan-500/30 to-transparent mx-7 origin-top"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why SecureRAG */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-800/50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why SecureRAG?</h2>
          <p className="text-slate-400 max-w-3xl text-lg leading-relaxed">
            Standard RAG systems introduce serious security risks. They trust document content as instructions,
            allow cross-user data leakage through vector search, expose APIs without rate limiting, and lack
            audit trails. SecureRAG addresses these threats with defense-in-depth at every layer.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {[
            { title: 'Prompt Injection', desc: 'Documents can contain hidden instructions that hijack the LLM into revealing secrets or bypassing safety rules.' },
            { title: 'Data Leakage', desc: 'Without user-scoped vector search, any user could retrieve any other user\'s embedded documents.' },
            { title: 'Malicious Uploads', desc: 'Unrestricted file uploads can lead to code execution, path traversal, or stored XSS attacks.' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security Architecture */}
      <section id="security" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-800/50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Security Architecture</h2>
          <p className="text-slate-400 max-w-3xl text-lg leading-relaxed mb-12">
            Every request passes through multiple security layers before producing an AI response.
          </p>
        </motion.div>

        <div className="glass-card p-8">
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {architectureSteps.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative"
              >
                <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-slate-900/40 border border-slate-800/50 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <span className="text-xs text-slate-300 font-medium">{step.label}</span>
                </div>
                {i < architectureSteps.length - 1 && i % 5 !== 4 && (
                  <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 w-4 h-4 text-slate-700" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-800/50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Security Features</h2>
          <p className="text-slate-400 max-w-3xl text-lg leading-relaxed mb-12">
            Real, functioning security controls — not just UI mockups.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-card-hover p-6 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 flex items-center justify-center mb-4 group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-all">
                <feature.icon className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-800/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-card p-12 text-center neon-border"
        >
          <ShieldCheck className="w-16 h-16 text-cyan-400 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Secure your AI knowledge layer.</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg mb-8">
            Deploy a RAG system that takes security seriously — from prompt injection defense to user-isolated vector search.
          </p>
          <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base">
            Get Started <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold">Secure<span className="gradient-text">RAG</span></span>
          </div>
          <p className="text-sm text-slate-500">Security-First RAG Platform</p>
        </div>
      </footer>
    </div>
  );
}

function StatusIndicator() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <span className="text-xs text-emerald-400 font-medium">Protected</span>
    </div>
  );
}
