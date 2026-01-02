"use client";

import { Search, MessageSquare, CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: Search,
      title: "DISCOVER",
      description: "Browse verified experts",
      color: "primary",
    },
    {
      number: "02",
      icon: MessageSquare,
      title: "CONNECT",
      description: "Discuss your needs",
      color: "accent",
    },
    {
      number: "03",
      icon: CheckCircle,
      title: "SUCCEED",
      description: "Get results",
      color: "info",
    },
  ];

  return (
    <section id="how-it-works" className="py-32 md:py-48 bg-muted/20 relative overflow-hidden">
      {/* Animated background lines */}
      <div className="absolute inset-0">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            style={{ top: `${20 + i * 20}%`, left: 0, right: 0 }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>

      <div className="section-container relative">
        {/* Section header */}
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-24"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <motion.p 
            className="text-sm font-medium text-primary uppercase tracking-[0.3em] mb-4"
          >
            Process
          </motion.p>
          <h2 className="text-5xl md:text-7xl font-black text-foreground tracking-tight">
            THREE STEPS TO
            <br />
            <span className="gradient-text">SUCCESS</span>
          </h2>
        </motion.div>

        {/* Steps - Horizontal timeline */}
        <div className="relative">
          {/* Connection line */}
          <motion.div 
            className="hidden md:block absolute top-1/2 left-0 right-0 h-px -translate-y-1/2"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.5 }}
            style={{
              background: "linear-gradient(90deg, transparent, hsl(160, 100%, 50%, 0.3), hsl(320, 100%, 60%, 0.3), hsl(200, 100%, 60%, 0.3), transparent)",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            {steps.map((step, index) => (
              <motion.div 
                key={index} 
                className="relative text-center group"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                {/* Step card */}
                <motion.div 
                  className="relative z-10 p-10 rounded-3xl bg-card/50 border border-white/5 backdrop-blur-sm"
                  whileHover={{ y: -10, borderColor: "rgba(255,255,255,0.1)" }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Glow on hover */}
                  <motion.div 
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: step.color === 'primary' 
                        ? 'radial-gradient(circle at center, hsl(160, 100%, 50%, 0.1) 0%, transparent 70%)'
                        : step.color === 'accent'
                        ? 'radial-gradient(circle at center, hsl(320, 100%, 60%, 0.1) 0%, transparent 70%)'
                        : 'radial-gradient(circle at center, hsl(200, 100%, 60%, 0.1) 0%, transparent 70%)',
                    }}
                  />

                  {/* Number */}
                  <span className="text-8xl font-black text-white/[0.03] absolute top-4 left-1/2 -translate-x-1/2 group-hover:text-white/[0.08] transition-colors duration-500">
                    {step.number}
                  </span>

                  {/* Icon */}
                  <motion.div 
                    className={`relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 ${
                      step.color === 'primary' ? 'bg-primary/10' 
                      : step.color === 'accent' ? 'bg-accent/10'
                      : 'bg-info/10'
                    }`}
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <step.icon 
                      size={36} 
                      className={
                        step.color === 'primary' ? 'text-primary' 
                        : step.color === 'accent' ? 'text-accent'
                        : 'text-info'
                      }
                    />
                  </motion.div>

                  {/* Content */}
                  <h3 className="relative z-10 text-2xl font-black text-foreground mb-3 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="relative z-10 text-muted-foreground">
                    {step.description}
                  </p>
                </motion.div>

                {/* Arrow between steps */}
                {index < steps.length - 1 && (
                  <motion.div 
                    className="hidden md:flex absolute top-1/2 -right-6 z-20 w-12 h-12 rounded-full bg-card border border-white/10 items-center justify-center"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.8 + index * 0.2 }}
                  >
                    <ArrowRight size={18} className="text-primary" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

