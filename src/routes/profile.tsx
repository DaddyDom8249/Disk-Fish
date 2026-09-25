import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/progress";
import { deleteAllUserData } from "@/lib/storage/db";
import { loadProfile, saveProfile, type LocalProfile } from "@/lib/storage/profile";
import type { CameraAngle, ThrowHand } from "@/lib/analysis/types";
import { PRODUCT } from "@/lib/product";
import { ANALYSIS_VERSIONS } from "@/lib/product";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const [profile, setProfile] = useState<LocalProfile>(() => loadProfile());
  const [cleared, setCleared] = useState(false);

  function update(p: LocalProfile) {
    setProfile(p);
    saveProfile(p);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">You</p>
        <h1 className="font-display text-3xl">Profile</h1>
      </div>
      <Card>
        <CardContent className="space-y-3">
          <Label>Display name</Label>
          <Input value={profile.displayName} onChange={(e) => update({ ...profile, displayName: e.target.value })} />
          <Label>Throwing hand</Label>
          <NativeSelect
            value={profile.throwingHand}
            onChange={(e) => update({ ...profile, throwingHand: e.target.value as ThrowHand })}
          >
            <option value="right">Right</option>
            <option value="left">Left</option>
          </NativeSelect>
          <Label>Units (for optional distance notes)</Label>
          <NativeSelect
            value={profile.units}
            onChange={(e) => update({ ...profile, units: e.target.value as LocalProfile["units"] })}
          >
            <option value="metric">Meters</option>
            <option value="imperial">Feet</option>
          </NativeSelect>
          <Label>Default camera</Label>
          <NativeSelect
            value={profile.defaultCameraAngle}
            onChange={(e) => update({ ...profile, defaultCameraAngle: e.target.value as CameraAngle })}
          >
            <option value="off-arm-side">Off-arm side</option>
            <option value="throwing-side">Throwing-arm side</option>
            <option value="rear-side">Rear-side</option>
            <option value="rear">Behind</option>
            <option value="front">Front</option>
          </NativeSelect>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <h2 className="font-display text-lg">Privacy</h2>
          <p className="text-sm text-muted-foreground">
            Videos and pose data stay on this device. They are not uploaded to a server. Model-training use is off and cannot be enabled in this version.
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Allow training use of my videos</span>
            <Switch checked={false} onCheckedChange={() => undefined} label="Training consent locked off" />
          </div>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm("Delete all throws and videos stored on this device?")) return;
              await deleteAllUserData();
              setCleared(true);
            }}
          >
            Delete all throws
          </Button>
          {cleared ? <p className="text-xs text-good">Local throw library cleared.</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 text-sm">
          <h2 className="font-display text-lg">About</h2>
          <p>{PRODUCT.name}</p>
          <p className="text-muted-foreground">
            Vision {ANALYSIS_VERSIONS.vision} · metrics {ANALYSIS_VERSIONS.metrics} · references {ANALYSIS_VERSIONS.references} ·
            coaching {ANALYSIS_VERSIONS.coaching}
          </p>
          <Link to="/methodology" className="text-accent">
            Methodology
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
