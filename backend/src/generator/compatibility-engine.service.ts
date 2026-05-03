import { Injectable } from "@nestjs/common";
import type { CompatibilityRulePlan, TraitPackPlan } from "./generator.types";

@Injectable()
export class CompatibilityEngineService {
  validateRules(pack: TraitPackPlan, rules: CompatibilityRulePlan[]) {
    const traitSet = new Set(Object.values(pack.categories).flat());
    const issues = rules.flatMap((rule) => {
      const errors: string[] = [];
      if (!traitSet.has(rule.trait)) errors.push(`Compatibility rule references missing trait ${rule.trait}`);
      rule.incompatibleWith.forEach((trait) => {
        if (!traitSet.has(trait)) errors.push(`Compatibility rule ${rule.trait} references missing conflict ${trait}`);
      });
      return errors;
    });

    return {
      passed: issues.length === 0,
      issues
    };
  }

  rejectBadCombination(traits: string[], rules: CompatibilityRulePlan[]) {
    const selected = new Set(traits);
    return rules
      .filter((rule) => selected.has(rule.trait) && rule.incompatibleWith.some((trait) => selected.has(trait)))
      .map((rule) => rule.reason);
  }
}

