import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AI_CLASSIFICATION_PROVIDER } from '../ai/ai-classification-provider';
import { AiClassificationService } from '../ai/ai-classification.service';
import { OpenAiClassificationProvider } from '../ai/openai-classification.provider';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
	imports: [AuthModule],
	controllers: [RequestsController],
	providers: [
		RequestsService,
		AiClassificationService,
		OpenAiClassificationProvider,
		{ provide: AI_CLASSIFICATION_PROVIDER, useExisting: OpenAiClassificationProvider },
	],
})
export class RequestsModule {}
