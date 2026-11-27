/**
 * CYT Fredericksburg Safe People Deduplicator
 *
 * Uses `mergePeoplePg` to losslessly re-point all 24 FK columns across 18 tables
 * before deleting duplicate person records.
 *
 * Safety rules:
 *   - NEVER auto-merges two rows with different non-null DOBs
 *   - NEVER auto-merges two rows with different non-null emails unless DOB matches
 *   - Always keeps the best profile (has password > Admin/Staff > most credits > lowest ID)
 *   - Also merges explicitly confirmed nickname pair: Pam King (3837) <- Pamela King (5339)
 *
 * Usage:
 *   npx tsx scripts/dedupe-cytfred-people.ts --dry-run
 *   npx tsx scripts/dedupe-cytfred-people.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  findDuplicatePeopleClustersPg,
  mergePeoplePg,
} from "../app/lib/db/people-merge-repo";
import { arePeopleSafeToAutoMerge } from "../app/lib/people-merge-helpers";

const TENANT = "cytfred";
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(`\n================================================`);
  console.log(`CYT Fredericksburg Safe People Dedupe ${DRY_RUN ? "[DRY RUN]" : "[LIVE]"}`);
  console.log(`================================================\n`);

  const clusters = await findDuplicatePeopleClustersPg(TENANT, 500);
  const exactClusters = clusters.filter((c) => c.matchType === "exact");

  let mergesPlanned = 0;
  let mergesCompleted = 0;
  let clustersSkippedUnsafe = 0;
  const totalsMoved: Record<string, number> = {
    assignments: 0,
    showTeam: 0,
    auditions: 0,
    classesTaught: 0,
    classEnrollments: 0,
  };

  // 1. Explicitly confirmed nickname merge: Pam King (3837) <- Pamela King (5339)
  const pamCluster = clusters.find(
    (c) =>
      c.people.some((p) => p.id === 3837) && c.people.some((p) => p.id === 5339)
  );
  if (pamCluster) {
    console.log(`  [Confirmed Nickname] Merging "Pamela King" (#5339) -> "Pam King" (#3837)`);
    mergesPlanned++;
    if (!DRY_RUN) {
      const res = await mergePeoplePg(TENANT, 3837, 5339);
      if (res.success && res.movedCounts) {
        mergesCompleted++;
        for (const [k, v] of Object.entries(res.movedCounts)) {
          totalsMoved[k] = (totalsMoved[k] || 0) + v;
        }
      } else {
        console.error("  Failed Pam King merge:", res.error);
      }
    }
  }

  // 2. Safe exact-name duplicates (pairwise safe against the recommended winner)
  for (const cluster of exactClusters) {
    const winner = cluster.people.find((p) => p.id === cluster.recommendedWinnerId) || cluster.people[0];
    const safeLosers = cluster.people.filter(
      (p) => p.id !== winner.id && arePeopleSafeToAutoMerge(winner, p)
    );

    if (safeLosers.length === 0) {
      clustersSkippedUnsafe++;
      continue;
    }

    for (const loser of safeLosers) {
      mergesPlanned++;
      if (!DRY_RUN) {
        const res = await mergePeoplePg(TENANT, winner.id, loser.id);
        if (res.success && res.movedCounts) {
          mergesCompleted++;
          for (const [k, v] of Object.entries(res.movedCounts)) {
            totalsMoved[k] = (totalsMoved[k] || 0) + v;
          }
        } else {
          console.error(`  Failed merge ${loser.id} -> ${winner.id}:`, res.error);
        }
      }
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Exact clusters scanned:    ${exactClusters.length}`);
  console.log(`  Unsafe clusters skipped:   ${clustersSkippedUnsafe} (different DOBs/emails — review in Settings)`);
  console.log(`  Merges planned:            ${mergesPlanned}`);
  if (!DRY_RUN) {
    console.log(`  Merges completed:          ${mergesCompleted}`);
    console.log(`  FK records moved:`, totalsMoved);
  }
  console.log(`\n✓ Done!\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
