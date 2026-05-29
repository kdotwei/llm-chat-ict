import type { Attachment, RouterDecision, Settings } from '../types'

function modelExists(model: string, availableModels: string[]): boolean {
  return !model || availableModels.length === 0 || availableModels.includes(model)
}

export function routeModel(
  input: string,
  attachments: Attachment[],
  settings: Settings,
  availableModels: string[],
): RouterDecision {
  const fallbackModel = settings.model

  if (!settings.autoRoutingEnabled) {
    return {
      model: fallbackModel,
      label: 'Manual',
      reason: 'Auto routing is disabled.',
    }
  }

  if (attachments.length > 0 && settings.visionModel && modelExists(settings.visionModel, availableModels)) {
    return {
      model: settings.visionModel,
      label: 'Vision',
      reason: 'An image attachment was detected, so the request was routed to the vision-capable model.',
    }
  }

  const reasoningPattern = /\b(code|debug|architecture|plan|compare|analy[sz]e|algorithm|why|design|refactor|optimi[sz]e|math)\b/i
  if (reasoningPattern.test(input) && settings.reasoningModel && modelExists(settings.reasoningModel, availableModels)) {
    return {
      model: settings.reasoningModel,
      label: 'Reasoning',
      reason: 'The prompt looks analytical, so it was routed to the reasoning model.',
    }
  }

  return {
    model: fallbackModel,
    label: 'General',
    reason: 'The default model is appropriate for this request.',
  }
}
