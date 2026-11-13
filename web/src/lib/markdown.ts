/** Compact markdown typography for cards, bubbles and the note preview. */
export const compactMarkdownClass = [
  '[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:my-0.5',
  '[&_strong]:font-medium [&_strong]:text-zinc-900',
  '[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2',
  '[&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12.5px]',
  '[&_pre]:my-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-50 [&_pre]:p-2.5 [&_pre]:text-xs',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_h1]:mt-2 [&_h1]:mb-1 [&_h1]:text-[15px] [&_h1]:font-semibold [&_h1]:text-zinc-900',
  '[&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-zinc-900',
  '[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-[13px] [&_h3]:font-semibold [&_h3]:text-zinc-900',
  '[&_blockquote]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-200 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-600',
  '[&_hr]:my-2 [&_hr]:border-zinc-200',
].join(' ');
