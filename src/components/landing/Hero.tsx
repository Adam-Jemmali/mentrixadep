"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);
  const scale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);

  return (
    <section ref={containerRef} className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-background">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 -z-10">
        <motion.div 
          className="absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full animate-morph"
          style={{
            background: "radial-gradient(circle, hsl(160, 100%, 50%, 0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full animate-morph"
          style={{
            background: "radial-gradient(circle, hsl(320, 100%, 60%, 0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
          animate={{
            x: [0, -80, 0],
            y: [0, 80, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(200, 100%, 50%, 0.1) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
          animate={{
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid overlay */}
      <div 
        className="absolute inset-0 -z-5 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(160, 100%, 50%) 1px, transparent 1px), linear-gradient(90deg, hsl(160, 100%, 50%) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
        }}
      />

      <motion.div 
        className="section-container py-32 md:py-40 relative z-10"
        style={{ y, opacity, scale }}
      >
        <div className="max-w-6xl mx-auto text-center">
          {/* Animated badge */}
          <motion.div 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/30 mb-12 backdrop-blur-sm"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Zap size={14} className="text-primary fill-primary" />
            </motion.div>
            <span className="text-sm font-medium text-primary">
              New Platform • Be Among the First to Join
            </span>
          </motion.div>

          {/* Main headline */}
          <div className="space-y-2 mb-10">
            <div className="overflow-hidden">
              <motion.h1 
                className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black tracking-tighter leading-[0.85]"
                initial={{ y: 200, skewY: 10 }}
                animate={{ y: 0, skewY: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <span className="text-foreground">ACADEMIC</span>
              </motion.h1>
            </div>
            <div className="overflow-hidden">
              <motion.h1 
                className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black tracking-tighter leading-[0.85]"
                initial={{ y: 200, skewY: 10 }}
                animate={{ y: 0, skewY: 0 }}
                transition={{ duration: 0.8, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <span className="gradient-text text-glow">EXCELLENCE</span>
              </motion.h1>
            </div>
          </div>

          {/* Subheadline */}
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-14 leading-relaxed font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            Connect with <span className="text-primary font-medium">verified experts</span>. 
            Transform your grades. <span className="text-accent font-medium">One tap</span>.
          </motion.p>

          {/* CTA buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="hero" 
                size="xl" 
                className="group relative overflow-hidden glow-button text-lg px-10 py-7" 
                asChild
              >
                <Link href="/student">
                  <span className="relative z-10 flex items-center gap-3">
                    Get Started
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <ArrowRight size={22} />
                    </motion.span>
                  </span>
                </Link>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                size="xl" 
                className="text-lg px-10 py-7 border-white/20 hover:bg-white/5 hover:border-primary/50" 
                asChild
              >
                <Link href="/auth/signup?role=tutor">Become a Provider</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div 
            className="flex flex-wrap items-center justify-center gap-8 md:gap-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          >
            {[
              { value: "4.9", label: "Rating", color: "primary" },
              { value: "New", label: "Platform", color: "accent" },
              { value: "100%", label: "Free", color: "info" },
            ].map((stat, index) => (
              <motion.div 
                key={index}
                className="text-center group cursor-default"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.2 + index * 0.1 }}
                whileHover={{ scale: 1.1 }}
              >
                <motion.p 
                  className={`text-4xl md:text-5xl font-black ${stat.color === 'primary' ? 'text-primary' : stat.color === 'accent' ? 'text-accent' : 'text-info'}`}
                  whileHover={{ textShadow: `0 0 30px currentColor` }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-sm text-muted-foreground mt-1 uppercase tracking-widest">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.8 }}
      >
        <motion.div 
          className="w-6 h-10 rounded-full border border-white/20 flex items-start justify-center p-2"
          whileHover={{ borderColor: "hsl(160, 100%, 50%)" }}
        >
          <motion.div 
            className="w-1 h-2 bg-primary rounded-full"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

