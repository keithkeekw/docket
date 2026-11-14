import { lazy, Suspense } from 'react';
import { loadReactMarkdown } from '../lib/deferredChunks';

const ReactMarkdown = lazy(loadReactMarkdown);

/** Rendered Markdown; the raw text stands in while the renderer chunk loads. */
export function Markdown({ children }: { children: string }) {
  return (
    <Suspense fallback={<p className="whitespace-pre-wrap">{children}</p>}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </Suspense>
  );
}
