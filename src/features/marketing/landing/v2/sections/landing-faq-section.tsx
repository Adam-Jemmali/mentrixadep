"use client";

import { motion } from "framer-motion";
import { ArenaMeshBackground } from "@/features/marketing/landing/v2/backgrounds/arena-mesh-background";
import {
  fadeUp,
  staggerContainer,
  viewportOnce,
} from "@/features/marketing/landing/v2/motion/landing-motion";
import {
  landingFaqCategories,
  landingFaqSectionHeading,
} from "@/shared/ui/accordion-messages-pure";
import {
  MentrixaAccordion,
  MentrixaAccordionItem,
} from "@/shared/ui/accordion-patterns";

export function LandingFaqSection() {
  const heading = landingFaqSectionHeading();
  const categories = landingFaqCategories();

  return (
    <section id="faq" className="relative overflow-hidden bg-[#0B1220] py-20 md:py-28">
      <ArenaMeshBackground variant="section" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300/80"
          >
            FAQ
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-3 font-bold text-white text-[clamp(22px,3.2vw,32px)] tracking-[-0.03em]"
          >
            {heading.title}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300"
          >
            {heading.subtitle}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="mt-10 space-y-8"
        >
          {categories.map((category, categoryIndex) => (
            <motion.div key={category.id} variants={fadeUp} custom={categoryIndex}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-violet-200/90">
                {category.title}
              </p>
              <MentrixaAccordion tone="marketing" variant="surface" allowsMultipleExpanded>
                {category.items.map((item) => (
                  <MentrixaAccordionItem
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    verdict={item.verdict}
                    nextAction={item.nextAction}
                  >
                    <p>{item.body}</p>
                  </MentrixaAccordionItem>
                ))}
              </MentrixaAccordion>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
