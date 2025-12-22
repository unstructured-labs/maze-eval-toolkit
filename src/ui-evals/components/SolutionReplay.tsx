import { Card, CardContent, CardHeader, CardTitle } from '@/ui-library/components/ui'
import type { EvaluationResult } from '../../core/types'

interface SolutionReplayProps {
  result: EvaluationResult
}

export default function SolutionReplay({ result }: SolutionReplayProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Model Reasoning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.reasoning ? (
          <div className="bg-muted rounded-md p-2 text-xs text-muted-foreground whitespace-pre-wrap">
            {result.reasoning}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No reasoning provided.</div>
        )}
      </CardContent>
    </Card>
  )
}
