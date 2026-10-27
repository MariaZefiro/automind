export const AI_CLASSIFICATION_PROVIDER = Symbol('AI_CLASSIFICATION_PROVIDER');

export type AiClassificationInput = {
  title: string;
  description: string;
  currentDepartment: string | null;
  availableDepartments: string[];
};

export interface AiClassificationProvider {
  classify(input: AiClassificationInput): Promise<unknown>;
}
