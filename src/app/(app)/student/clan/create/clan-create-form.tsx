"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
        <Label htmlFor="cname">Clan name</Label>
        <Input
          id="cname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5"
          required
          minLength={2}
          maxLength={60}
        />
        <p className="text-xs text-slate-500 mt-1">Must be unique across Mentrixa.</p>
      </div>
      <div>
        <Label htmlFor="ctag">Short tag</Label>
        <Input
          id="ctag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="mt-1.5 font-mono uppercase"
          required
          minLength={2}
          maxLength={8}
          placeholder="e.g. MATH01"
        />
        <p className="text-xs text-slate-500 mt-1">2–8 letters or numbers, shown on your badge.</p>
      </div>
      <div>
        <Label htmlFor="cdesc">Description (optional)</Label>
        <Textarea
          id="cdesc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1.5 min-h-[88px]"
          maxLength={500}
        />
      </div>
      <div>
        <Label>Subject focus (optional)</Label>
        <Select value={focus || "__none__"} onValueChange={(v) => setFocus(v === "__none__" ? "" : v)}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Any subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Any subject</SelectItem>
            {divisions.map((d) => (
              <SelectItem key={d.key} value={d.key}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>How Mentrixers join</Label>
          <Select
            value={joinMode}
            onValueChange={(v) => setJoinMode(v as "open" | "approval")}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open invite or discover</SelectItem>
              <SelectItem value="approval">Approval you confirm requests</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Discoverability</Label>
          <Select
            value={isPublic ? "yes" : "no"}
            onValueChange={(v) => setIsPublic(v === "yes")}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Listed in clan search</SelectItem>
              <SelectItem value="no">Invite-only (hidden from search)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Badge icon</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CLAN_AVATAR_PRESETS.map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant={preset === k ? "default" : "outline"}
              className="capitalize"
              onClick={() => setPreset(k)}
            >
              {k}
            </Button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create clan"}
      </Button>
    </form>
  );
}
