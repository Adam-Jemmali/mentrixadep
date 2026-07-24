"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui";
import { MentrixaVocabIcon } from "@/shared/icons/mentrixa-vocab-icons";
import type { AuthUser } from "@/shared/core/auth";

const AP_CALC_NODES = [
  { label: "Chain Rule", href: "/student/mastery" },
  { label: "Product Rule", href: "/student/mastery" },
  { label: "Quotient Rule", href: "/student/mastery" },
  { label: "Related Rates", href: "/student/mastery" },
  { label: "Optimization", href: "/student/mastery" },
  { label: "Riemann Sums", href: "/student/mastery" },
  { label: "Fundamental Theorem", href: "/student/mastery" },
  { label: "U Substitution", href: "/student/mastery" },
] as const;

type PaletteAction = {
  id: string;
  group: "Quest" | "Nodes" | "Guides";
  label: string;
  keywords: string;
  href: string;
  icon: ReactNode;
};

function buildActions(user: AuthUser | null): PaletteAction[] {
  const isStudent = user?.role === "student" && user.approved;
  const isTutor = user?.role === "tutor" && user.approved;
  const actions: PaletteAction[] = [];

  if (isStudent) {
    actions.push(
      {
        id: "quest-start",
        group: "Quest",
        label: "Start a quest",
        keywords: "practice pack ap calc ab",
        href: "/student/quest",
        icon: <MentrixaVocabIcon name="quest" size={16} surface="dark" title="Quest" />,
      },
      {
        id: "quest-retest",
        group: "Quest",
        label: "Retest weak node",
        keywords: "retest first attempt verified",
        href: "/student/quest?prompt=Retest%20weak%20node",
        icon: <MentrixaVocabIcon name="skills" size={16} surface="dark" title="Retest" />,
      },
    );
    for (const node of AP_CALC_NODES) {
      actions.push({
        id: `node-${node.label}`,
        group: "Nodes",
        label: node.label,
        keywords: `ap calculus ab ${node.label.toLowerCase()} skill node`,
        href: node.href,
        icon: <MentrixaVocabIcon name="skills" size={16} surface="dark" title={node.label} />,
      });
    }
    actions.push({
      id: "guides-browse",
      group: "Guides",
      label: "Browse guides",
      keywords: "book session tutor guide slots",
      href: "/student#browse-guides",
      icon: <MentrixaVocabIcon name="profile" size={16} surface="dark" title="Guides" />,
    });
  }

  if (isTutor) {
    actions.push(
      {
        id: "guide-home",
        group: "Guides",
        label: "Guide home",
        keywords: "tutor dashboard command center",
        href: "/tutor",
        icon: <MentrixaVocabIcon name="home" size={16} surface="dark" title="Home" />,
      },
      {
        id: "guide-studio",
        group: "Guides",
        label: "Studio packages",
        keywords: "session ai package review",
        href: "/tutor/sessions-ai",
        icon: <MentrixaVocabIcon name="brief" size={16} surface="dark" title="Studio" />,
      },
      {
        id: "guide-profile",
        group: "Guides",
        label: "Your public profile",
        keywords: "impact score rank portfolio",
        href: user?.id ? `/tutor/${user.id}` : "/tutor",
        icon: <MentrixaVocabIcon name="profile" size={16} surface="dark" title="Profile" />,
      },
    );
    for (const node of AP_CALC_NODES) {
      actions.push({
        id: `guide-node-${node.label}`,
        group: "Nodes",
        label: node.label,
        keywords: `demand weak students ${node.label.toLowerCase()}`,
        href: "/tutor#guide-roster",
        icon: <MentrixaVocabIcon name="skills" size={16} surface="dark" title={node.label} />,
      });
    }
  }

  if (!isStudent && !isTutor) {
    actions.push({
      id: "landing",
      group: "Quest",
      label: "Try AP Calculus AB",
      keywords: "guest diagnostic quest",
      href: "/",
      icon: <MentrixaVocabIcon name="quest" size={16} surface="dark" title="Quest" />,
    });
  }

  return actions;
}

export function MentrixaCommandPalette({ user }: { user: AuthUser | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const actions = useMemo(() => buildActions(user), [user]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = useCallback(
    (href: string) => {
      setOpen(false);
      if (href.includes("#")) {
        const [path, hash] = href.split("#");
        router.push(path ?? href);
        window.setTimeout(() => {
          document.getElementById(hash ?? "")?.scrollIntoView({ behavior: "smooth" });
        }, 280);
        return;
      }
      router.push(href);
    },
    [router],
  );

  if (actions.length === 0) return null;

  const groups = ["Quest", "Nodes", "Guides"] as const;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search quests, nodes, guides…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {groups.map((group) => {
          const items = actions.filter((a) => a.group === group);
          if (items.length === 0) return null;
          return (
            <CommandGroup key={group} heading={group}>
              {items.map((action) => (
                <CommandItem
                  key={action.id}
                  value={`${action.label} ${action.keywords}`}
                  onSelect={() => run(action.href)}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
      <div className="border-t border-white/10 px-3 py-2 text-[10px] text-slate-500">
        <CommandShortcut>⌘K</CommandShortcut>
        <span className="ml-2">Power search</span>
      </div>
    </CommandDialog>
  );
}
