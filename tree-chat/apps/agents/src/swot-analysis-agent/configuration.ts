import { Annotation } from '@langchain/langgraph';

const ConfigurableAnnotation = Annotation.Root({
  model: Annotation<string>,
  analysisDepth: Annotation<'basic' | 'detailed' | 'strategic'>,
  language: Annotation<'ja' | 'en'>,
  industryContext: Annotation<string | null>,
  companySize: Annotation<'startup' | 'small' | 'medium' | 'large' | null>,
});

export const configurable = ConfigurableAnnotation;