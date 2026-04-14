import { getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';

export default async function Home() {
  const t = await getTranslations('Index');

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-20">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex rounded-full border px-4 py-1 text-sm text-muted-foreground">
            NueraDigital SaaS
          </span>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">{t('title')}</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{t('description')}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="rounded-md bg-primary px-6 py-3 text-primary-foreground">
            Masuk Dashboard
          </Link>
          <Link href="/pricing" className="rounded-md border px-6 py-3">
            Lihat Paket
          </Link>
        </div>
      </div>
    </main>
  );
}
