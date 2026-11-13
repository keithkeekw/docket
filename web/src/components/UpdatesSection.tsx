import { updateStatusSchema } from '@app/shared';
import { format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { apiGet } from '../api/client';
import { useApplyUpdate, useCheckUpdates, useUpdateInfo } from '../api/updates';
import { useDateLocale, useT, tNow } from '../lib/i18n';
import { confirmAction } from '../store/confirm';
import { Button } from './Button';
import { InlineError } from './InlineError';

/**
 * Settings → About & Updates. The check is read-only; applying hands the server
 * over to the supervisor, so the page polls until the new version answers.
 */
export function UpdatesSection() {
  const t = useT();
  const dateLocale = useDateLocale();
  const location = useLocation();
  const info = useUpdateInfo();
  const check = useCheckUpdates();
  const apply = useApplyUpdate();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // The sidebar update pill links to #about-updates. Settings sections load
  // above this one, so retry while the page settles instead of scrolling once.
  useEffect(() => {
    if (location.hash !== '#about-updates') return;

    const scroll = () => {
      const section = document.getElementById('about-updates');
      if (!section) return;
      const rect = section.getBoundingClientRect();
      if (rect.top >= 0 && rect.top <= window.innerHeight - 160) return;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const timers = [0, 250, 700, 1300].map((delay) => window.setTimeout(scroll, delay));
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [location.hash]);

  // Finish an update that was already in flight when the page loaded.
  useEffect(() => {
    let cancelled = false;
    void apiGet('/api/updates/status', updateStatusSchema)
      .then((status) => {
        if (cancelled) return;
        if (status.state === 'requested' || status.state === 'updating') setUpdating(true);
        if (status.state === 'error' && status.message) setUpdateError(status.message);
      })
      .catch(() => {
        // The check route is optional; the normal check below still runs.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll while the server restarts; reload when the new version is live.
  useEffect(() => {
    if (!updating) return;

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt > 10 * 60_000) {
        setUpdateError(
          tNow('The update is taking longer than expected. Check the terminal running Docket.'),
        );
        setUpdating(false);
        return;
      }

      void apiGet('/api/updates/status', updateStatusSchema)
        .then((status) => {
          if (status.state === 'done') {
            window.location.reload();
            return;
          }
          if (status.state === 'error') {
            setUpdateError(status.message ?? tNow('The update failed.'));
            setUpdating(false);
          }
        })
        .catch(() => {
          // Expected while the server is stopped for the update.
        });
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [updating]);

  async function handleUpdate() {
    const latest = info.data?.latest;
    if (!latest) return;

    const confirmed = await confirmAction({
      title: t('Update Docket'),
      message: t('Docket will update to {version} and restart. Save your work before continuing.', {
        version: latest.tag,
      }),
      confirmLabel: t('Update'),
    });
    if (!confirmed) return;

    setUpdateError(null);
    setUpdating(true);

    try {
      await apply.mutateAsync({ tag: latest.tag });
    } catch (error) {
      setUpdating(false);
      setUpdateError(error instanceof Error ? error.message : t('Could not start the update.'));
    }
  }

  const data = info.data;
  const checkError = check.error instanceof Error ? check.error.message : null;
  const latest = data?.latest ?? null;
  const notes = latest?.notes.trim() ?? '';
  const checkedAt = data ? format(parseISO(data.checkedAt), 'HH:mm', { locale: dateLocale }) : null;

  return (
    <section id="about-updates" className="mt-8 scroll-mt-6 border-t border-zinc-200 pt-5">
      <h2 className="text-[15px] font-semibold text-zinc-900">{t('About & Updates')}</h2>
      <p className="mt-1 max-w-[560px] text-xs text-zinc-500">
        {t('Check GitHub Releases and install a newer version from here.')}
      </p>

      <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900">
              {t('Current version: {version}', { version: `v${data?.currentVersion ?? '…'}` })}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {data ? (
                <>
                  {t('Repository: {repository}', { repository: data.repository })}
                  {checkedAt && <> · {t('Last checked {time}', { time: checkedAt })}</>}
                </>
              ) : (
                t('Checking…')
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {latest && (
              <a
                href={latest.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
              >
                {t('Release notes')}
              </a>
            )}
            <Button
              onClick={() => {
                setUpdateError(null);
                check.mutate();
              }}
              disabled={info.isFetching || check.isPending || updating}
            >
              {info.isFetching || check.isPending ? t('Checking…') : t('Check for Updates')}
            </Button>
          </div>
        </div>

        {info.error && !data && (
          <InlineError
            message={info.error.message}
            onRetry={() => {
              check.mutate();
            }}
          />
        )}

        {checkError && (
          <InlineError
            message={checkError}
            onRetry={() => {
              check.mutate();
            }}
          />
        )}

        {data?.checkError && !info.error && (
          <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {t('Could not check GitHub Releases: {message}', { message: data.checkError })}
          </p>
        )}

        {updating ? (
          <div className="mt-3 flex items-start gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-700">
            <span
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700"
            />
            <div>
              <p className="font-medium">
                {latest ? t('Updating to {version}…', { version: latest.tag }) : t('Updating…')}
              </p>
              <p className="mt-0.5">{t('The app will restart and reload when it is ready.')}</p>
            </div>
          </div>
        ) : updateError ? (
          <InlineError
            message={updateError}
            onRetry={() => {
              setUpdateError(null);
              check.mutate();
            }}
          />
        ) : data && latest && data.updateAvailable ? (
          <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-900">
                {t('Version {version} is available.', { version: latest.tag })}
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  void handleUpdate();
                }}
                disabled={apply.isPending}
              >
                {t('Update to {version}', { version: latest.tag })}
              </Button>
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {latest.name}
              {latest.publishedAt && (
                <> · {format(parseISO(latest.publishedAt), 'd MMM yyyy', { locale: dateLocale })}</>
              )}
            </p>
            {notes && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-700">
                  {t('Release notes')}
                </summary>
                <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-white p-2.5 text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-700">
                  {notes}
                </pre>
              </details>
            )}
          </div>
        ) : data && !latest && !data.checkError ? (
          <p className="mt-3 text-xs text-zinc-500">{t('No releases have been published yet.')}</p>
        ) : data ? (
          <p className="mt-3 text-xs text-zinc-500">{t("You're on the latest release.")}</p>
        ) : null}
      </div>
    </section>
  );
}
