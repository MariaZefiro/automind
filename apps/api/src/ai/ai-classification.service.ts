import { BadGatewayException, HttpException, Inject, Injectable } from '@nestjs/common';
import { Priority, RequestCategory } from '@prisma/client';
import { AI_CLASSIFICATION_PROVIDER, AiClassificationProvider } from './ai-classification-provider';

export type ValidatedAiClassification = {
  category: RequestCategory;
  priority: Priority;
  suggestedDepartment: string | null;
  summary: string;
  suggestedAction: string;
  confidence: number;
};

@Injectable()
export class AiClassificationService {
  constructor(@Inject(AI_CLASSIFICATION_PROVIDER) private readonly provider: AiClassificationProvider) {}

  async classify(input: Parameters<AiClassificationProvider['classify']>[0]): Promise<ValidatedAiClassification> {
    let result: unknown;
    try {
      result = await this.provider.classify(input);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadGatewayException('Falha ao comunicar com o provedor de IA.');
    }
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw new BadGatewayException('A resposta do provedor de IA não corresponde ao formato esperado.');
    }
    const value = result as Record<string, unknown>;
    const expectedFields = ['category', 'priority', 'suggestedDepartment', 'summary', 'suggestedAction', 'confidence'];
    if (Object.keys(value).length !== expectedFields.length || Object.keys(value).some((key) => !expectedFields.includes(key))) {
      throw new BadGatewayException('A resposta do provedor contém campos inesperados.');
    }
    const categories = Object.values(RequestCategory) as string[];
    const priorities = Object.values(Priority) as string[];
    if (!categories.includes(String(value.category)) || !priorities.includes(String(value.priority))) {
      throw new BadGatewayException('A resposta do provedor contém categoria ou prioridade inválida.');
    }
    if (typeof value.suggestedDepartment !== 'string' && value.suggestedDepartment !== null) {
      throw new BadGatewayException('A resposta do provedor contém departamento inválido.');
    }
    if (typeof value.summary !== 'string' || value.summary.trim().length < 3 || value.summary.length > 1000) {
      throw new BadGatewayException('A resposta do provedor contém resumo inválido.');
    }
    if (typeof value.suggestedAction !== 'string' || value.suggestedAction.trim().length < 3 || value.suggestedAction.length > 2000) {
      throw new BadGatewayException('A resposta do provedor contém ação sugerida inválida.');
    }
    if (typeof value.confidence !== 'number' || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) {
      throw new BadGatewayException('A resposta do provedor contém confiança inválida.');
    }
    return {
      category: value.category as RequestCategory,
      priority: value.priority as Priority,
      suggestedDepartment: value.suggestedDepartment === null ? null : value.suggestedDepartment.trim(),
      summary: value.summary.trim(),
      suggestedAction: value.suggestedAction.trim(),
      confidence: value.confidence,
    };
  }
}
