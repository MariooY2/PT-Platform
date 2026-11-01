import { Weight } from '@/components/format';
import type { Question } from '../schemas';

/**
 * Read-only rendering of a submitted response: each question's label with the client's answer,
 * formatted by type. Shared by the coach review queue and the client's own submitted view.
 */
export function AnswersView({
  questions,
  answers,
}: {
  questions: Question[];
  answers: Record<string, unknown>;
}) {
  return (
    <dl className="space-y-4">
      {questions.map((q) => {
        const value = answers[q.id];
        return (
          <div key={q.id} className="space-y-0.5">
            <dt className="text-sm text-muted-foreground">{q.label}</dt>
            <dd className="text-sm">
              <AnswerValue question={q} value={value} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function AnswerValue({ question, value }: { question: Question; value: unknown }) {
  if (value === undefined || value === null || value === '') {
    return <span className="text-muted-foreground">No answer</span>;
  }
  switch (question.type) {
    case 'weight':
      return typeof value === 'number' ? <Weight kg={value} /> : <span>{String(value)}</span>;
    case 'scale':
      return (
        <span>
          <span className="num">{String(value)}</span>
          <span className="ml-1 text-xs text-muted-foreground">/ 10</span>
        </span>
      );
    case 'number':
      return <span className="num">{String(value)}</span>;
    case 'yes_no':
      return <span>{value ? 'Yes' : 'No'}</span>;
    case 'photo':
      return <span className="text-muted-foreground">Photo added</span>;
    default:
      return <span className="whitespace-pre-wrap">{String(value)}</span>;
  }
}
