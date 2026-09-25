import { motion } from 'framer-motion';
import { useMemo } from 'react';

export function CyberBackground({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const particles = useMemo(
    () =>
      Array.from({ length: variant === 'minimal' ? 15 : 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 10,
      })),
    [variant]
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e17] via-[#0a0e17] to-[#0f1420]" />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* Radial glow top */}
      <div
        className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, transparent 70%)' }}
      />

      {/* Radial glow bottom */}
      <div
        className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)' }}
      />

      {/* Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.id % 3 === 0 ? 'rgba(0, 212, 255, 0.4)' : p.id % 3 === 1 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)',
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)',
        }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
