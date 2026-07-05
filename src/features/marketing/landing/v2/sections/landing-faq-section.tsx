"use client";

import { motion } from "framer-motion";
import {
  fadeUp,
  staggerContainer,
  viewportOnce,
} from "@/features/marketing/landing/v2/motion/landing-motion";
import {
  landingFaqCategories,
  landingFaqCategoryVocabIcon,
  landingFaqSectionHeading,
} from "@/shared/ui/accordion-messages-pure";
import {
  MentrixaAccordion,
  MentrixaAccordionItem,
} from "@/shared/ui/accordion-patterns";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import { LandingSectionHeader, LandingSectionShell, LandingStickyCard } from "@/features/marketing/landing/ui/landing-section-shell";
import { landingHub } from "@/features/marketing/landing/landing-hub-ui";

export function LandingFaqSection() {
  const heading = landingFaqSectionHeading();
  const categories = landingFaqCategories();

  return (
    <LandingSectionShell id="faq" innerClassName="max-w-3xl">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer}
      >
        <LandingSectionHeader title={heading.title} subtitle={heading.subtitle} eyebrow="FAQ" />
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
            <LandingStickyCard rotate={categoryIndex % 2 === 0} className={categoryIndex % 2 === 1 ? "rotate-[0.4deg]" : undefined}>
              <p className={`mb-3 inline-flex items-center gap-2 ${landingHub.eyebrow}`}>
                <MentrixaVocabIcon
                  name={landingFaqCategoryVocabIcon(category.id)}
                  size={16}
                  surface="light"
                  title={category.title}
                />
                {category.title}
              </p>
              <MentrixaAccordion tone="light" variant="surface" allowsMultipleExpanded>
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
            </LandingStickyCard>
          </motion.div>
        ))}
      </motion.div>
    </LandingSectionShell>
  );
}
