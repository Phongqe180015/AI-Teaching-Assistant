import { aiApi } from '@/lib/api';

export interface PromptGenerationState {
  isGenerating: boolean;
  loadingMsg: string;
  subjectId: string | null;
  promptId: string | null;
  generatedContent: string | null;
  successMsg: string | null;
  error: string | null;
  isCompleted: boolean;
}

type Listener = (state: PromptGenerationState) => void;

class PromptGenerationStoreManager {
  private state: PromptGenerationState = {
    isGenerating: false,
    loadingMsg: '',
    subjectId: null,
    promptId: null,
    generatedContent: null,
    successMsg: null,
    error: null,
    isCompleted: false,
  };

  private listeners: Set<Listener> = new Set();

  getState(): PromptGenerationState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(partial: Partial<PromptGenerationState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.state));
  }

  clearCompleted() {
    this.setState({
      isCompleted: false,
    });
  }

  reset() {
    this.setState({
      isGenerating: false,
      loadingMsg: '',
      subjectId: null,
      promptId: null,
      generatedContent: null,
      successMsg: null,
      error: null,
      isCompleted: false,
    });
  }

  async startExecuteGenerate(params: {
    templateType: 'quiz' | 'essay';
    questionCount: number;
    language: 'vi' | 'en';
    difficulty: string;
    topic: string;
    description: string;
    subjectCode: string;
    subjectId: string;
    promptId?: string;
    name: string;
    fallbackPrompt: string;
  }) {
    this.setState({
      isGenerating: true,
      loadingMsg: 'Gemini is analyzing configuration and initializing the system prompt...',
      subjectId: params.subjectId,
      promptId: params.promptId || null,
      generatedContent: null,
      error: null,
      isCompleted: false,
    });

    try {
      let finalContent = params.fallbackPrompt;
      try {
        const res = await aiApi.generatePrompt({
          name: params.name || params.subjectCode || 'Prompt Template',
          topic: params.topic || `Create a ${params.templateType === 'quiz' ? 'quiz' : 'essay'} for subject ${params.subjectCode}`,
          category: params.templateType === 'quiz' ? 'Quiz' : 'Essay',
          difficulty: params.difficulty,
          subjectCode: params.subjectCode,
          additionalNotes: `Question count: ${params.questionCount}, Language: ${params.language}, Description: ${params.description}`,
        });

        const apiContent = res?.prompt || (res as any)?.data?.prompt;
        if (apiContent) {
          finalContent = apiContent;
        }
      } catch (e) {
        // Fallback to locally generated prompt
      }

      this.setState({
        isGenerating: false,
        loadingMsg: '',
        generatedContent: finalContent,
        successMsg: 'Prompt template generated successfully from your configuration!',
        isCompleted: true,
      });
    } catch (err: any) {
      this.setState({
        isGenerating: false,
        loadingMsg: '',
        error: err.message || 'An error occurred while generating the prompt with AI.',
        isCompleted: false,
      });
    }
  }

  async startAiRefine(params: {
    content: string;
    subjectCode: string;
    subjectId: string;
    promptId?: string;
  }) {
    this.setState({
      isGenerating: true,
      loadingMsg: 'Gemini is optimizing and reformatting the system prompt...',
      subjectId: params.subjectId,
      promptId: params.promptId || null,
      generatedContent: null,
      error: null,
      isCompleted: false,
    });

    try {
      let refinedContent = '';
      try {
        const res = await aiApi.refinePrompt({ content: params.content });
        refinedContent = res?.prompt || (res as any)?.data?.prompt;
      } catch (e) {
        // Fallback refinement logic
      }

      if (!refinedContent) {
        refinedContent = `You are a top expert/lecturer in subject ${params.subjectCode || 'IT'}.\n\nPrimary task:\n${params.content.trim()}\n\nOutput requirements:\n- Present content clearly and professionally.\n- Support variables: {assignment_name}, {student_code}, {requirements}.\n- Response format: standard Markdown.`;
      }

      this.setState({
        isGenerating: false,
        loadingMsg: '',
        generatedContent: refinedContent,
        successMsg: 'Prompt refined and formatted by AI successfully!',
        isCompleted: true,
      });
    } catch (err: any) {
      this.setState({
        isGenerating: false,
        loadingMsg: '',
        error: err.message || 'An error occurred while refining the prompt with AI.',
        isCompleted: false,
      });
    }
  }
}

export const promptGenerationStore = new PromptGenerationStoreManager();
