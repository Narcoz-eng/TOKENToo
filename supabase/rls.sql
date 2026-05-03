-- Apply after Prisma has created the public tables.
-- Browser clients should read public market/community state only.
-- Writes are expected to go through the backend using the dedicated Prisma role.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'User',
    'Token',
    'Collection',
    'VaultNFT',
    'TraitPack',
    'Trait',
    'RaidRoom',
    'RaidMission',
    'RaidParticipation',
    'XPLog',
    'StakingPosition',
    'Listing',
    'Sale',
    'FeeLedger',
    'BuybackEvent',
    'RiskScoreSnapshot',
    'GenerationRun',
    'LogoAnalysis',
    'CommunityContext',
    'StyleProfile',
    'GeneratorTraitPack',
    'GeneratorTraitDefinition',
    'CompatibilityRule',
    'PreviewAsset',
    'QualityReport',
    'DistinctivenessReport'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public."Token"') is not null then
    drop policy if exists "Public token read" on public."Token";
    create policy "Public token read" on public."Token" for select using (true);
  end if;

  if to_regclass('public."Collection"') is not null then
    drop policy if exists "Public collection read" on public."Collection";
    create policy "Public collection read" on public."Collection" for select using (true);
  end if;

  if to_regclass('public."VaultNFT"') is not null then
    drop policy if exists "Public vault nft read" on public."VaultNFT";
    create policy "Public vault nft read" on public."VaultNFT" for select using (true);
  end if;

  if to_regclass('public."RaidRoom"') is not null then
    drop policy if exists "Public raid room read" on public."RaidRoom";
    create policy "Public raid room read" on public."RaidRoom" for select using (true);
  end if;

  if to_regclass('public."RaidMission"') is not null then
    drop policy if exists "Public raid mission read" on public."RaidMission";
    create policy "Public raid mission read" on public."RaidMission" for select using (true);
  end if;

  if to_regclass('public."Listing"') is not null then
    drop policy if exists "Public listing read" on public."Listing";
    create policy "Public listing read" on public."Listing" for select using (true);
  end if;

  if to_regclass('public."Sale"') is not null then
    drop policy if exists "Public sale read" on public."Sale";
    create policy "Public sale read" on public."Sale" for select using (true);
  end if;

  if to_regclass('public."GenerationRun"') is not null then
    drop policy if exists "Public approved generation read" on public."GenerationRun";
    create policy "Public approved generation read" on public."GenerationRun" for select using (status = 'APPROVED');
  end if;

  if to_regclass('public."StyleProfile"') is not null then
    drop policy if exists "Public approved style profile read" on public."StyleProfile";
    create policy "Public approved style profile read" on public."StyleProfile" for select using (isApproved = true);
  end if;

  if to_regclass('public."PreviewAsset"') is not null then
    drop policy if exists "Public approved preview asset read" on public."PreviewAsset";
    create policy "Public approved preview asset read" on public."PreviewAsset" for select using (
      exists (
        select 1 from public."StyleProfile" sp
        where sp.id = "PreviewAsset"."styleProfileId" and sp."isApproved" = true
      )
    );
  end if;
end $$;
