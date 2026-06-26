-- PROMPT 007: Per-skill AP exam stakes copy for guest diagnostic verdict.
-- Run after 117-ap-calc-verified-rank-cache.sql

ALTER TABLE public.skill_nodes
  ADD COLUMN IF NOT EXISTS exam_stakes text;

COMMENT ON COLUMN public.skill_nodes.exam_stakes IS
  'One sentence on how often this skill appears on the real AP exam (guest diagnostic stakes line).';

UPDATE public.skill_nodes
SET exam_stakes = CASE unit_number
  WHEN 1 THEN 'Limits and continuity are tested on virtually every AP Calculus AB exam, often in the opening free-response question.'
  WHEN 2 THEN 'Derivative rules and interpretations appear throughout the exam, especially in chained multiple-choice items.'
  WHEN 3 THEN 'Composite, implicit, and inverse functions show up on most exams in both multiple-choice and free-response sections.'
  WHEN 4 THEN 'Contextual applications of derivatives are a standard free-response topic almost every year.'
  WHEN 5 THEN 'Analytical applications of derivatives, including optimization and related rates, are core exam staples.'
  WHEN 6 THEN 'Integration techniques and definite integrals appear on every AP Calculus AB exam.'
  WHEN 7 THEN 'Differential equations and slope fields are recurring multiple-choice and free-response targets.'
  WHEN 8 THEN 'Applications of integration, including volume and motion, are tested on most exams.'
  ELSE 'This skill is part of the official AP Calculus AB course and exam.'
END
WHERE subject = 'AP Calculus AB'
  AND (exam_stakes IS NULL OR trim(exam_stakes) = '');
