"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClan } from "@/app/actions/clan";
import { CLAN_AVATAR_PRESETS } from "@/lib/clan-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DivisionFocusSelect } from "@/components/student/division-focus-select";
import {
  clanArenaOutlineButton,
  clanArenaPrimaryButton,
  clanLightFieldHint,
  clanLightFieldLabel,
  clanLightInput,
  clanLightSelectContent,
  clanLightSelectItem,
  clanLightSelectTrigger,
} from "@/lib/clan-light-form-ui";

type Div = { key: string; name: string };

export function ClanCreateForm({ divisions }: { divisions: Div[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [focus, setFocus] = useState<string>("");
  const [joinMode, setJoinMode] = useState<"open" | "approval">("open");
  const [isPublic, setIsPublic] = useState(true);
  const [preset, setPreset] = useState<string>("shield");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/student/clan");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await createClan(name, tag, {
      description: description.trim() || undefined,
      focusDivisionKey: focus || null,
      joinMode,
      isPublic,
      avatarPresetKey: preset,
    });
    setLoading(false);
    if (!r.success) {
      setError(r.error);
      return;
    }
    if (r.clanId) {
      router.push(`/student/clan/${r.clanId}`);
    } else {
      router.push("/student/clan");
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-6 max-w-lg">
      <div>
        <Label htmlFor="cname" className={clanLightFieldLabel}>Clan name</Label>
        <Input
          id="cname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={clanLightInput}
          required
          minLength={2}
          maxLength={60}
        />
        <p className={clanLightFieldHint}>Must be unique across Mentrixa.</p>
      </div>
      <div>
        <Label htmlFor="ctag" className={clanLightFieldLabel}>Short tag</Label>
        <Input
          id="ctag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className={`${clanLightInput} font-mono uppercase`}
          required
          minLength={2}
          maxLength={8}
          placeholder="e.g. MATH01"
        />
        <p className={clanLightFieldHint}>2–8 letters or numbers, shown on your badge.</p>
      </div>
      <div>
        <Label htmlFor="cdesc" className={clanLightFieldLabel}>Description (optional)</Label>
        <Textarea
          id="cdesc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${clanLightInput} min-h-[88px]`}
          maxLength={500}
        />
      </div>
      <div>
        <Label className={clanLightFieldLabel}>Subject focus (optional)</Label>
        <DivisionFocusSelect
          value={focus || null}
          onValueChange={(v) => setFocus(v ?? "")}
          divisions={divisions}
          noneLabel="Any subject"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className={clanLightFieldLabel}>How Mentrixers join</Label>
          <Select
            value={joinMode}
            onValueChange={(v) => setJoinMode(v as "open" | "approval")}
          >
            <SelectTrigger className={clanLightSelectTrigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={clanLightSelectContent}>
              <SelectItem value="open" className={clanLightSelectItem}>Open invite or discover</SelectItem>
              <SelectItem value="approval" className={clanLightSelectItem}>Approval only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={clanLightFieldLabel}>Discoverability</Label>
          <Select
            value={isPublic ? "yes" : "no"}
            onValueChange={(v) => setIsPublic(v === "yes")}
          >
            <SelectTrigger className={clanLightSelectTrigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={clanLightSelectContent}>
              <SelectItem value="yes" className={clanLightSelectItem}>Listed in clan search</SelectItem>
              <SelectItem value="no" className={clanLightSelectItem}>Invite-only (hidden from search)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className={clanLightFieldLabel}>Badge icon</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CLAN_AVATAR_PRESETS.map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={preset === k ? "default" : "outline"}
              className={
                preset === k
                  ? clanArenaPrimaryButton
                  : `${clanArenaOutlineButton} capitalize`
              }
              onClick={() => setPreset(k)}
            >
              {k}
            </Button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      <Button type="submit" disabled={loading} className={clanArenaPrimaryButton}>
        {loading ? "Creating…" : "Create clan"}
      </Button>
    </form>
  );
}
