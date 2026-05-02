import Link from "next/link";
import { BadgeCheck, MessageSquare, Send, Share2, Swords, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Leaderboard } from "@/components/Leaderboard";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionCard } from "@/components/SectionCard";
import { StatusPill } from "@/components/StatusPill";
import { activity, collections, getCollection, leaderboard, raidRooms } from "@/lib/mock-data";

export function generateStaticParams() {
  return collections.map((collection) => ({ id: collection.id }));
}

export default function CommunityPage({ params }: { params: { id: string } }) {
  const collection = getCollection(params.id);

  return (
    <AppShell active="profile">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="text-sm text-slate-400">
            <Link href="/collections">Collections</Link> <span className="mx-2">/</span> <Link href={`/collections/${collection.id}`}>{collection.name}</Link> <span className="mx-2">/</span> <span className="text-white">Community</span>
          </div>

          <SectionCard>
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_520px]">
              <img src={collection.image} alt={collection.name} className="aspect-square w-full rounded-lg object-cover" />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black">{collection.name}</h1>
                  <BadgeCheck className="size-7 text-vault-purple" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill accent="purple">Solana</StatusPill>
                  <StatusPill accent="green">Meme</StatusPill>
                  <StatusPill accent="cyan">Community Driven</StatusPill>
                </div>
                <p className="max-w-2xl text-slate-300">{collection.description}</p>
                <div className="flex gap-3">
                  <button className="h-11 rounded-lg bg-vault-purple px-5 text-sm font-bold">Following</button>
                  {[Send, MessageSquare, Share2].map((Icon, index) => (
                    <button key={index} className="flex size-11 items-center justify-center rounded-lg border border-vault-line bg-black/25" aria-label="Community link">
                      <Icon className="size-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="glass rounded-lg p-4">
                <h2 className="text-sm font-bold uppercase">Community Overview</h2>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  <CommunityMetric label="Holders" value={collection.holders.toLocaleString()} />
                  <CommunityMetric label="Raiders" value="25,341" />
                  <CommunityMetric label="Guilds" value="128" />
                  <CommunityMetric label="XP 24h" value="85.4K" />
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex items-end justify-between">
                    <div>
                      <p className="text-sm uppercase text-slate-400">Community Level</p>
                      <p className="text-2xl font-black text-vault-green">Level {collection.level}</p>
                    </div>
                    <StatusPill accent="purple">Next Level 4</StatusPill>
                  </div>
                  <ProgressBar value={collection.xp} max={collection.nextXp} />
                  <p className="mt-2 text-sm text-slate-400">{collection.xp.toLocaleString()} / {collection.nextXp.toLocaleString()} XP</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_520px]">
            <SectionCard title="Collection Progress">
              <div className="grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
                <div className="relative overflow-hidden rounded-lg">
                  <img src={collection.banner} alt="" className="h-64 w-full object-cover" />
                  <div className="absolute bottom-4 left-4 rounded-lg border border-vault-green/40 bg-black/65 px-5 py-3 text-2xl font-black text-vault-green">
                    Level {collection.level}
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">Let&apos;s reach Level 4 together.</h2>
                  <p className="text-slate-400">The more the community raids, holds, stakes, and trades, the more future traits and cNFT badges unlock.</p>
                  <div>
                    <p className="text-2xl font-black">{collection.xp.toLocaleString()} <span className="text-base font-normal text-slate-400">/ {collection.nextXp.toLocaleString()} XP</span></p>
                    <ProgressBar value={collection.xp} max={collection.nextXp} />
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center text-xs">
                    {["+3 New Traits", "Yield Boost", "Raid Reward", "cNFT Drop"].map((unlock) => (
                      <div key={unlock} className="rounded-lg border border-vault-line bg-black/25 p-3 text-slate-300">{unlock}</div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="How To Earn XP">
              <div className="space-y-3 text-sm">
                {[
                  ["Complete raids", "+100 - 500 XP"],
                  ["Stake Vault NFT", "+200 XP / day"],
                  ["Hold Vault NFT", "+10 XP / day"],
                  ["Invite friends", "+50 XP"],
                  ["Trade on marketplace", "+20 XP / trade"]
                ].map(([label, xp]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-black/20 p-3">
                    <span>{label}</span>
                    <span className="font-bold text-vault-green">{xp}</span>
                  </div>
                ))}
              </div>
              <Link href={`/collections/${collection.id}/raids`} className="mt-4 flex h-11 items-center justify-center rounded-lg bg-vault-purple font-bold">
                View All Missions
              </Link>
            </SectionCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Recent Raid Activity">
              <div className="space-y-3">
                {raidRooms.map((raid) => (
                  <div key={raid.id} className="flex items-center gap-3 rounded-lg bg-black/20 p-3">
                    <Swords className="size-5 text-vault-purple" />
                    <div className="flex-1">
                      <p className="font-semibold">{raid.name}</p>
                      <p className="text-xs text-slate-500">Completed by {raid.participants.toLocaleString()} raiders</p>
                    </div>
                    <span className="font-bold text-vault-green">+{Math.round(raid.progress * 40)} XP</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Community Feed">
              <div className="space-y-4">
                <FeedPost author="FrogMaster" image={collection.image} tag="Pinned" body="Level 3 achieved. New swamp backgrounds are unlocked for future mints; old holders will receive a badge drop." />
                <FeedPost author="SwampKing" image={collection.image} body="Just completed Swamp Takeover with the squad. Pushing for Level 4 before the next distribution." />
              </div>
            </SectionCard>
          </div>

          <SectionCard className="border-vault-purple/40 bg-vault-purple/10">
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)_280px] md:items-center">
              <img src="/art/frog-vault.png" alt="" className="h-28 w-full rounded-lg object-cover" />
              <div>
                <h2 className="text-2xl font-black">Community Rewards Pool</h2>
                <p className="mt-2 text-slate-300">The more the community raids together, the bigger the rewards pool for everyone.</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Current Pool</p>
                <p className="text-3xl font-black">12,850 SOL</p>
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-5">
          <SectionCard>
            <Leaderboard rows={leaderboard} title="Community Leaderboard" />
          </SectionCard>
          <SectionCard title="Top Communities">
            <div className="space-y-3">
              {["Swamp Lords", "Frog Nation", "Toxic Brigade", "Lily Pad Club"].map((guild, index) => (
                <div key={guild} className="flex items-center justify-between rounded-lg bg-black/20 p-3">
                  <div className="flex items-center gap-3">
                    <Users className="size-5 text-vault-gold" />
                    <div>
                      <p className="font-semibold">{guild}</p>
                      <p className="text-xs text-slate-500">{125 - index * 22} members</p>
                    </div>
                  </div>
                  <span className="text-vault-green">{(24520 - index * 4300).toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Recent Activity">
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={item.actor + item.time} className="flex items-center gap-3 rounded-lg bg-black/20 p-3">
                  <img src={item.image} alt="" className="size-9 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p><span className="font-semibold">{item.actor}</span> <span className="text-slate-400">{item.action}</span></p>
                    <p className="text-xs text-slate-500">{item.time}</p>
                  </div>
                  <span className="text-vault-green">{item.amount}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </AppShell>
  );
}

function CommunityMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vault-line bg-black/25 p-3">
      <p className="font-bold">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function FeedPost({ author, image, body, tag }: { author: string; image: string; body: string; tag?: string }) {
  return (
    <article className="rounded-lg border border-vault-line bg-black/20 p-4">
      <div className="flex items-center gap-3">
        <img src={image} alt="" className="size-10 rounded-full object-cover" />
        <div>
          <p className="font-semibold">{author}</p>
          <p className="text-xs text-slate-500">2h ago</p>
        </div>
        {tag ? <span className="ml-auto rounded-md bg-vault-purple/25 px-2 py-1 text-xs text-vault-purple">{tag}</span> : null}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
    </article>
  );
}
