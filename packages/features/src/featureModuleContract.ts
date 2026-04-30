export type FeatureModulePriority = "MVP" | "V1" | "V2" | "Future";

export type FeatureModuleContract = {
  readonly module: string;
  readonly purpose: string;
  readonly owns: readonly string[];
  readonly doesNotOwn: readonly string[];
  readonly integrationPoints: readonly string[];
  readonly priority: FeatureModulePriority;
};
