import { StateGraph } from "@langchain/langgraph";
import { ReporterState, ReporterStateType } from "./state.js";
import { 
  REPORTER_SYSTEM_PROMPT, 
  REPORTER_GENERATION_PROMPT,
  REPORTER_ANALYSIS_PROMPT
} from "./prompts.js";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Helper function to generate unique IDs
function generateId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Analyze SubTask results for consistency and insights
async function analyzeResults(state: ReporterStateType): Promise<Partial<ReporterStateType>> {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.2,
  });

  try {
    const completedSubTasks = state.completedSubTasks || [];
    
    // Format SubTask results for analysis
    const formattedResults = completedSubTasks.map((task, index) => 
      `### SubTask ${index + 1}: ${task.title}
**Description**: ${task.description}
**Conclusion**: ${task.result?.conclusion || 'No conclusion'}
**Evidence**: ${task.result?.evidence?.join('\n- ') || 'No evidence'}
**Confidence**: ${task.result?.confidence || 0}
**Sources**: ${task.result?.sources?.length || 0} sources

---`
    ).join('\n');

    const analysisPrompt = REPORTER_ANALYSIS_PROMPT
      .replace('{subTaskResults}', formattedResults);

    const response = await model.invoke([
      new SystemMessage(REPORTER_SYSTEM_PROMPT),
      new HumanMessage(analysisPrompt)
    ]);

    return {
      messages: [response]
    };

  } catch (error) {
    console.error('Results analysis error:', error);
    return {
      messages: []
    };
  }
}

// Generate comprehensive report
async function generateReport(state: ReporterStateType): Promise<Partial<ReporterStateType>> {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.3,
  });

  try {
    const researchIssue = state.researchIssue;
    const completedSubTasks = state.completedSubTasks || [];
    const executionMetadata = state.executionMetadata;

    if (!researchIssue) {
      throw new Error("Missing research issue");
    }

    // Format SubTask results
    const subTaskResults = completedSubTasks.map((task, index) => 
      `### ${index + 1}. ${task.title}
**Description**: ${task.description}
**Priority**: ${task.priority}
**Conclusion**: ${task.result?.conclusion || 'No conclusion provided'}

**Key Evidence**:
${task.result?.evidence?.map(e => `- ${e}`).join('\n') || '- No evidence provided'}

**Sources** (${task.result?.sources?.length || 0}):
${task.result?.sources?.map(s => `- [${s.title}](${s.url || '#'}) (Relevance: ${s.relevance}, Credibility: ${s.credibility})`).join('\n') || '- No sources'}

**Confidence Level**: ${task.result?.confidence || 0}/1.0

---`
    ).join('\n\n');

    // Create report generation prompt
    const reportPrompt = REPORTER_GENERATION_PROMPT
      .replace('{researchTitle}', researchIssue.title || '')
      .replace('{researchDescription}', researchIssue.description || '')
      .replace('{researchBackground}', researchIssue.background || 'No background provided')
      .replace('{researchObjectives}', researchIssue.objectives?.join('\n- ') || '')
      .replace('{researchScope}', researchIssue.scope || '')
      .replace('{startedAt}', executionMetadata?.startedAt || '')
      .replace('{completedAt}', executionMetadata?.completedAt || '')
      .replace('{totalExecutionTime}', (executionMetadata?.totalExecutionTime || 0).toString())
      .replace('{totalSubTasks}', completedSubTasks.length.toString())
      .replace('{subTaskResults}', subTaskResults);

    const response = await model.invoke([
      new SystemMessage(REPORTER_SYSTEM_PROMPT),
      new HumanMessage(reportPrompt)
    ]);

    const reportContent = response.content as string;

    // Process and structure the report
    const report = {
      title: researchIssue.title + " - Research Report",
      executiveSummary: extractSection(reportContent, 'Executive Summary') || 
                       `${researchIssue.title}に関する包括的な調査を実施し、${completedSubTasks.length}の主要領域を分析しました。`,
      methodology: extractSection(reportContent, 'Methodology') || 
                  "Web検索を中心とした包括的なデスクリサーチを実施。複数の信頼できる情報源から情報を収集し、分析・統合しました。",
      keyFindings: generateKeyFindings(completedSubTasks),
      conclusions: extractListSection(reportContent, 'Conclusions') || 
                  [`${researchIssue.title}について基本的な理解を得ることができました。`],
      recommendations: generateRecommendations(completedSubTasks, reportContent),
      limitations: extractListSection(reportContent, 'Limitations') || 
                  ["本研究はWeb情報を中心としており、一次データの収集は行っていません。"],
      nextSteps: extractListSection(reportContent, 'Next Steps') || undefined,
      appendices: [{
        id: generateId(),
        title: "SubTask Results Summary",
        content: subTaskResults,
        type: 'data' as const
      }],
      generatedAt: new Date().toISOString()
    };

    // Generate summary statistics
    const successfulTasks = completedSubTasks.filter(task => 
      task.result && task.result.confidence > 0.5).length;
    
    const avgConfidence = completedSubTasks.reduce((sum, task) => 
      sum + (task.result?.confidence || 0), 0) / Math.max(completedSubTasks.length, 1);

    const keyInsights = completedSubTasks
      .filter(task => task.result?.confidence && task.result.confidence > 0.7)
      .map(task => task.result?.conclusion || task.title)
      .slice(0, 5);

    const summary = {
      totalSubTasks: completedSubTasks.length,
      successfulTasks,
      keyInsights,
      confidenceLevel: avgConfidence
    };

    return {
      report,
      summary,
      messages: [...(state.messages || []), response]
    };

  } catch (error) {
    console.error('Report generation error:', error);
    
    // Fallback report
    const fallbackReport = {
      title: (state.researchIssue?.title || 'Research') + " - Report",
      executiveSummary: "レポート生成中にエラーが発生しました。",
      methodology: "調査手法の記録に問題が発生しました。",
      keyFindings: [],
      conclusions: [`エラーにより完全なレポートを生成できませんでした: ${error}`],
      recommendations: [],
      limitations: ["技術的な問題によりレポート生成が制限されました。"],
      generatedAt: new Date().toISOString()
    };

    return {
      report: fallbackReport,
      summary: {
        totalSubTasks: state.completedSubTasks?.length || 0,
        successfulTasks: 0,
        keyInsights: [],
        confidenceLevel: 0
      }
    };
  }
}

// Helper functions for parsing report content
function extractSection(content: string, sectionName: string): string | null {
  const regex = new RegExp(`##\\s*${sectionName}[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

function extractListSection(content: string, sectionName: string): string[] | null {
  const section = extractSection(content, sectionName);
  if (section) {
    return section.split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(item => item.length > 0);
  }
  return null;
}

function generateKeyFindings(subTasks: any[]): any[] {
  return subTasks
    .filter(task => task.result && task.result.confidence > 0.6)
    .map((task, _index) => ({
      id: generateId(),
      title: task.title,
      description: task.result?.conclusion || '',
      evidence: task.result?.evidence || [],
      sources: task.result?.sources || [],
      confidence: task.result?.confidence || 0,
      significance: task.priority === 'high' ? 'high' : 
                   task.result?.confidence > 0.8 ? 'high' : 'medium'
    }))
    .slice(0, 10); // Limit to top 10 findings
}

function generateRecommendations(_subTasks: any[], reportContent: string): any[] {
  const recommendations = extractListSection(reportContent, 'Recommendations') || [];
  
  return recommendations.map((rec, index) => ({
    id: generateId(),
    title: `推奨事項 ${index + 1}`,
    description: rec,
    rationale: "調査結果の分析に基づく推奨事項",
    priority: index < 2 ? 'high' : 'medium',
    timeline: "短期(1-3ヶ月)",
    resources: ["専門知識", "追加調査"]
  })).slice(0, 5);
}

// Build the graph
const workflow = new StateGraph(ReporterState)
  .addNode("analyze_results", analyzeResults)
  .addNode("generate_report", generateReport)
  .addEdge("__start__", "analyze_results")
  .addEdge("analyze_results", "generate_report")
  .addEdge("generate_report", "__end__");

export const graph = workflow.compile();